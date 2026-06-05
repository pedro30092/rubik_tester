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
import { getGame, Game } from './code';

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

  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    // React to timerEnabled changes: pause or resume the game timer.
    effect(() => {
      const enabled = this.timerEnabled();
      // Use untracked to avoid accidentally tracking non-signal reads.
      untracked(() => {
        const game = getGame() as (Game & { state: number }) | null;
        if (!game) return;
        if (!enabled) {
          (game.timer as any).stop();
        } else if (game.state === 1 /* Playing */) {
          (game.timer as any).start(true /* continueGame */);
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
  }

  /**
   * Monkey-patches game.timer.start so that it is a no-op whenever
   * timerEnabled is false. This covers game-internal calls (e.g. startGame).
   */
  private patchGameTimer(): void {
    const game = getGame() as any;
    if (!game) return;
    const originalStart = (game.timer.start as Function).bind(game.timer);
    game.timer.start = (continueGame?: boolean) => {
      if (!this.timerEnabled()) return;
      originalStart(continueGame);
    };
  }

  // ---------------------------------------------------------------------------
  // Keyboard dispatch
  // ---------------------------------------------------------------------------

  private onKeydown(event: KeyboardEvent): void {
    const game = getGame() as any;
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
        const game = getGame() as any;
        if (!game || !this.canReset(game)) return;
        this.resetPiecesToSolved(game);
        (game.timer as any).stop();
        (game.timer as any).reset();
      },
      // ── onComplete (at ~600 ms) : overlay gone, start scramble animation ──
      () => {
        const game = getGame() as any;
        if (!game) return;
        game.scrambler.scramble();
        game.controls.scrambleCube();
        if (this.timerEnabled()) (game.timer as any).start(false);
      },
    );
  }

  /** Resets the cube to the solved (all-finished) state, with a poof. */
  solveWithPoof(): void {
    this.triggerPoof(() => {
      const game = getGame() as any;
      if (!game || !this.canReset(game)) return;
      this.resetPiecesToSolved(game);
      (game.timer as any).stop();
      (game.timer as any).reset();
    });
  }

  /** Toggle timer on / off. */
  setTimerEnabled(enabled: boolean): void {
    this.timerEnabled.set(enabled);
  }

  // ---------------------------------------------------------------------------
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

  ngOnDestroy(): void {
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }
  }
}
