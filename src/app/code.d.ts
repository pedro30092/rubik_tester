export function initializeRubikGame(): unknown;
export function getGame(): unknown;

export const LAYER_MOVE: 'LAYER';
export const CUBE_MOVE: 'CUBE';
export const AXIS: { X: 'x'; Y: 'y'; Z: 'z' };

export function rotateFace(notation: string, callback?: () => void): void;
export function rotateCube(axis: 'x' | 'y' | 'z', angle: number, callback?: () => void): void;
export function startGame(): void;
export function exitGame(): void;
export function applyAlgorithm(algorithm: string, onComplete?: () => void): void;
