import {
  Injectable,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { getGame, startGame } from './code';

/** Mirrors the STILL constant from code.js (Controls state = 0). */
const STILL = 0;

@Injectable({ providedIn: 'root' })
export class KeyboardHandlerService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * When false the game timer is paused and its UI is hidden via a CSS class
   * applied by the host component. Toggle at any time using setTimerEnabled().
   */
  readonly timerEnabled = signal(true);

  /**
   * Briefly true while the poof overlay is animating.
   * Drives the [class.poof-active] binding in the template.
   */
  readonly poofActive = signal(false);

  /** Formatted elapsed time driven by our own interval, e.g. "1:23". */
  readonly timerDisplay = signal('0:00');

  /** True once the timer has started at least once in the current game. */
  readonly timerRunning = signal(false);

  private keydownListener: ((e: KeyboardEvent) => void) | null = null;
  private timerPollId: ReturnType<typeof setInterval> | null = null;
  private _timerRunning = false;
  private timerStartedAt: number | null = null;
  private originalOnSolved: (() => void) | null = null;

  constructor() {
    // React to timerEnabled changes: pause or resume the game timer.
    effect(() => {
      const enabled = this.timerEnabled();
      // Use untracked to avoid accidentally tracking non-signal reads.
      untracked(() => {
        const game = getGame();
        if (!game) return;
        if (!enabled) {
          game.timer.stop();
        } else if (game.state === 1 /* Playing */) {
          game.timer.start(true /* continueGame */);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Call once inside ngAfterViewInit(), after initializeRubikGame().
   * Registers the global keydown listener and patches game.timer.start so
   * the timerEnabled signal is always respected.
   */
  initialize(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.patchGameTimer();

    this.keydownListener = (e: KeyboardEvent) => this.onKeydown(e);
    window.addEventListener('keydown', this.keydownListener);

    // Update the display every 100 ms from our own start timestamp.
    this.timerPollId = setInterval(() => {
      if (!this._timerRunning || this.timerStartedAt === null) return;
      this.timerDisplay.set(this.formatElapsed(Date.now() - this.timerStartedAt));
    }, 100);
  }

  /**
   * Monkey-patches game.timer.start so that it is a no-op whenever
   * timerEnabled is false. This covers game-internal calls (e.g. startGame).
   */
  private patchGameTimer(): void {
    const game = getGame();
    if (!game) return;

    this.originalOnSolved = game.controls.onSolved;

    const originalStart = game.timer.start.bind(game.timer);
    game.timer.start = (continueGame?: boolean) => {
      if (!this.timerEnabled()) return;
      originalStart(continueGame);
      this.timerStartedAt = Date.now();
      this._timerRunning = true;
      this.timerRunning.set(true);
    };

    const originalStop = game.timer.stop.bind(game.timer);
    game.timer.stop = () => {
      this._timerRunning = false;
      return originalStop();
    };

    const originalReset = game.timer.reset.bind(game.timer);
    game.timer.reset = () => {
      this._timerRunning = false;
      this.timerRunning.set(false);
      this.timerStartedAt = null;
      this.timerDisplay.set('0:00');
      originalReset();
    };
  }

  private formatElapsed(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // ---------------------------------------------------------------------------
  // Keyboard dispatch
  // ---------------------------------------------------------------------------

  private onKeydown(event: KeyboardEvent): void {
    const game = getGame();
    if (!game) return;

    // Only respond while actively playing.
    if (game.state !== 1) return;
    // Ignore while an automated scramble is running.
    if (game.controls.scramble !== null) return;
    // Ignore while a rotation animation is in progress.
    if (game.controls.state !== STILL) return;

    switch (event.code) {
      case 'KeyR':
        event.preventDefault();
        this.scrambleWithPoof();
        break;
      case 'Space':
        event.preventDefault();
        this.solveWithPoof();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Public actions — can also be triggered programmatically from components.
  // ---------------------------------------------------------------------------

  /** Resets the cube to a fresh random scrambled position, with a poof. */
  scrambleWithPoof(): void {
    this.triggerPoof(
      // ── onPeak (at ~250 ms) : instant state change hidden by the overlay ──
      () => {
        const game = getGame();
        if (!game || !this.canReset(game)) return;
        this.resetPiecesToSolved(game);
        game.timer.stop();
        game.timer.reset();
      },
      // ── onComplete (at ~600 ms) : overlay gone, start scramble animation ──
      () => {
        const game = getGame();
        if (!game) return;
        // Restore normal solve detection before the new scramble begins.
        if (this.originalOnSolved) game.controls.onSolved = this.originalOnSolved;
        // Reset display to 0:00 before scramble begins
        this._timerRunning = false;
        this.timerRunning.set(false);
        this.timerStartedAt = null;
        this.timerDisplay.set('0:00');
        game.scrambler.scramble();
        game.controls.scrambleCube();
        // Poll until the scramble animation finishes, then start the timer.
        this.waitForScrambleEnd(game);
      },
    );
  }

  /** Resets the cube to the solved (all-finished) state, with a poof. */
  solveWithPoof(): void {
    this.triggerPoof(() => {
      const game = getGame();
      if (!game || !this.canReset(game)) return;
      this.resetPiecesToSolved(game);
      game.timer.stop();
      game.timer.reset();
      // Suppress the solve-detection callback so free play after an
      // auto-solve doesn't falsely trigger the "Complete!" animation.
      game.controls.onSolved = () => {};
    });
  }

  /** Toggle timer on / off. */
  setTimerEnabled(enabled: boolean): void {
    this.timerEnabled.set(enabled);
  }

  /**
   * If the game is still on the intro/menu screen (state 0), calls startGame()
   * so the cube zooms in and begins scrambling.
   * Returns true when the game was just started (caller should skip its own
   * action — startGame already includes a scramble).
   * Returns false when already playing (caller proceeds normally).
   */
  ensureStarted(): boolean {
    const game = getGame();
    if (!game || game.state !== 0) return false;
    startGame();
    return true;
  }

  /**
   * DEV MODE ONLY — calls startGame() and waits for the engine's mandatory
   * scramble animation to finish, then instantly resets the cube to solved.
   * Result: the game is active and the cube starts in a clean solved state.
   */
  startSolved(): void {
    const game = getGame();
    if (!game || game.state !== 0) return;

    // Phase 0: wait for the engine's intro animation to finish before
    // calling startGame() — same guard the native double-tap handler uses.
    // const waitForIdle = setInterval(() => {
    //   if ((game.transition as any).activeTransitions > 0) return;
    //   clearInterval(waitForIdle);

    //   startGame();

    //   // Phase A: wait until the scramble animation has started.
    //   const waitForStart = setInterval(() => {
    //     if (game.controls.scramble === null) return;
    //     clearInterval(waitForStart);

    //     // Phase B: wait until the scramble animation finishes.
    //     const waitForEnd = setInterval(() => {
    //       if (game.controls.scramble !== null) return;
    //       clearInterval(waitForEnd);
    //       this.resetPiecesToSolved(game);
    //       game.timer.stop();
    //       game.timer.reset();
    //       // Suppress false "Complete!" trigger after the instant reset.
    //       game.controls.onSolved = () => {};
    //     }, 50);
    //   }, 50);
    // }, 50);
  }

  // Internals
  // ---------------------------------------------------------------------------

  /**
   * Drives the poof overlay animation:
   *   onPeak     – called at ~250 ms (overlay is at full opacity, cube hidden)
   *   onComplete – called at ~600 ms (overlay faded out, new state is visible)
   */
  private triggerPoof(onPeak: () => void, onComplete?: () => void): void {
    if (this.poofActive()) return; // debounce concurrent calls
    this.poofActive.set(true);
    setTimeout(() => onPeak(), 250);
    setTimeout(() => {
      this.poofActive.set(false);
      onComplete?.();
    }, 600);
  }

  private canReset(game: any): boolean {
    return game.controls.state === STILL && game.controls.scramble === null;
  }

  /**
   * Instantly returns every cube piece to its solved starting
   * position/rotation and resets all container rotations.
   */
  private resetPiecesToSolved(game: any): void {
    game.cube.pieces.forEach((piece: any) => {
      piece.position.copy(piece.userData.start.position);
      piece.rotation.copy(piece.userData.start.rotation);
    });
    // Resets holder, object, animator, and controls.edges rotations to zero.
    game.cube.reset();
    game.controls.state = STILL;
  }

  private waitForScrambleEnd(game: any): void {
    const check = setInterval(() => {
      if (game.controls.scramble !== null) return; // still scrambling
      clearInterval(check);
      if (this.timerEnabled()) {
        this.timerStartedAt = Date.now();
        this._timerRunning = true;
        this.timerRunning.set(true);
      }
    }, 50);
  }

  ngOnDestroy(): void {
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }
    if (this.timerPollId) {
      clearInterval(this.timerPollId);
      this.timerPollId = null;
    }
  }
}
