// ── Sub-system interfaces ───────────────────────────────────────────────────

export interface GameTimer {
  /** Start (or resume) the timer. Pass true to continue from elapsed time. */
  start(continueGame?: boolean): void;
  /** Stop the timer and return the final time. */
  stop(): { time: string; millis: number };
  /** Reset internal counters to zero without stopping the animation loop. */
  reset(): void;
  converted: string;
  deltaTime: number;
}

export interface GameControls {
  /** 0=STILL 1=PREPARING 2=ROTATING 3=ANIMATING */
  state: number;
  /** Non-null while an automated scramble animation is running. */
  scramble: unknown | null;
  enabled: boolean;
  onSolved: () => void;
  scrambleCube(): void;
  keyboardMove(
    type: string,
    move: { axis: string; angle: number; position?: unknown },
    callback?: () => void,
  ): void;
  enable(): void;
  disable(): void;
}

export interface GameScrambler {
  scramble(scramble?: string | number): GameScrambler;
  converted: unknown[];
  print: string;
}

export interface GameCube {
  size: number;
  /** Three.js Object3D array — each element has userData.start for initial pose. */
  pieces: unknown[];
  /** Resets container, holder, animator and controls.edges rotations to zero. */
  reset(): void;
  init(): void;
}

export interface Game {
  /** 0=Menu 1=Playing 2=Complete 3=Stats 4=Prefs 5=Theme */
  state: number;
  saved: boolean;
  newGame: boolean;
  cube: GameCube;
  controls: GameControls;
  scrambler: GameScrambler;
  timer: GameTimer;
  transition: unknown;
  preferences: unknown;
  scores: unknown;
  storage: unknown;
  themes: unknown;
  themeEditor: unknown;
  world: unknown;
}

// ── Public API ──────────────────────────────────────────────────────────────

export function initializeRubikGame(): Game;
export function getGame(): Game | null;

export const LAYER_MOVE: 'LAYER';
export const CUBE_MOVE: 'CUBE';
export const AXIS: { X: 'x'; Y: 'y'; Z: 'z' };
export const FACE_MOVES: Record<string, { axis: string; row: number; angle: number }>;

export function rotateFace(notation: string, callback?: () => void): void;
export function rotateCube(axis: 'x' | 'y' | 'z', angle: number, callback?: () => void): void;
export function startGame(): void;
export function exitGame(): void;
export function applyAlgorithm(algorithm: string, onComplete?: () => void): void;
