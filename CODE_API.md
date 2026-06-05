# Rubik Cube – `code.js` Public API

`code.js` is an ES module.  
It owns the entire game engine (Three.js scene, animation loop, cube logic, UI transitions).  
Angular only touches it through the exported functions documented here.

---

## Initialization

### `initializeRubikGame(): Game`

Creates the singleton `Game` instance, expands the `<range>` UI tags, and starts the intro animation.  
Must be called **after** Angular has rendered the template (i.e. inside `ngAfterViewInit`).  
Calling it more than once is safe — it returns the existing instance.

```ts
import { initializeRubikGame } from './code';

ngAfterViewInit() {
  const game = initializeRubikGame();
}
```

### `getGame(): Game | null`

Returns the active `Game` instance, or `null` if `initializeRubikGame` has not been called yet.

```ts
import { getGame } from './code';

const game = getGame();
if (game) { /* safe to use */ }
```

---

## Game Flow

### `startGame(): void`

Triggers a scramble, zoom-in transition, and enters **Playing** state.  
Equivalent to double-tapping the cube on the menu screen.

```ts
import { startGame } from './code';
startGame();
```

### `exitGame(): void`

Returns to the **Menu** state, pauses the timer, and plays the zoom-out transition.

```ts
import { exitGame } from './code';
exitGame();
```

---

## Cube Rotation

### `rotateFace(notation, callback?): void`

Rotates a single face layer using **standard Rubik's Cube notation**.  
The move is animated; `callback` fires when the animation completes.

| Parameter | Type | Description |
|---|---|---|
| `notation` | `string` | Standard move string (see table below) |
| `callback` | `() => void` | Optional — called when animation ends |

**Only works while the game is in Playing state and the controls are enabled.**

```ts
import { rotateFace } from './code';

rotateFace("R");          // rotate Right face clockwise
rotateFace("U'");         // rotate Up face counter-clockwise
rotateFace("F", () => console.log('done'));
```

**Supported notation:**

| Move | Effect |
|---|---|
| `U` / `U'` | Top layer clockwise / counter-clockwise |
| `D` / `D'` | Bottom layer |
| `R` / `R'` | Right layer |
| `L` / `L'` | Left layer |
| `F` / `F'` | Front layer |
| `B` / `B'` | Back layer |

---

### `rotateCube(axis, angle, callback?): void`

Rotates the **entire cube** on a world axis (no layer selection).

| Parameter | Type | Description |
|---|---|---|
| `axis` | `'x' \| 'y' \| 'z'` | World axis to rotate on |
| `angle` | `number` | Rotation in radians (`Math.PI / 2` = 90°) |
| `callback` | `() => void` | Optional — called when animation ends |

```ts
import { rotateCube } from './code';

rotateCube('y', Math.PI / 2);          // rotate whole cube 90° around Y
rotateCube('x', -Math.PI / 2, () => console.log('done'));
```

---

### `applyAlgorithm(algorithm, onComplete?): void`

Executes a **space-separated sequence** of standard notation moves, one by one, each waiting for the previous animation to finish.

| Parameter | Type | Description |
|---|---|---|
| `algorithm` | `string` | Space-separated move string |
| `onComplete` | `() => void` | Optional — called after the last move |

```ts
import { applyAlgorithm } from './code';

// Sexy move
applyAlgorithm("R U R' U'");

// T-perm
applyAlgorithm("R U R' U' R' F R2 U' R' U' R U R' F'", () => {
  console.log('T-perm done');
});
```

---

## Constants

```ts
import { LAYER_MOVE, CUBE_MOVE, AXIS, FACE_MOVES } from './code';

LAYER_MOVE  // 'LAYER' — pass to controls.keyboardMove for layer rotations
CUBE_MOVE   // 'CUBE'  — pass to controls.keyboardMove for whole-cube rotations

AXIS.X  // 'x'
AXIS.Y  // 'y'
AXIS.Z  // 'z'

FACE_MOVES['R']   // { axis: 'x', row: 1, angle: -Math.PI/2 }
FACE_MOVES["U'"]  // { axis: 'y', row: 1, angle: -Math.PI/2 }
// ... all 12 faces
```

---

## Direct `Game` Instance (advanced)

`getGame()` returns the raw `Game` object, giving access to every internal subsystem:

```ts
const game = getGame();

// Sub-systems
game.cube          // Cube  — pieces, positions, size, colors
game.controls      // Controls — drag, layer select, scramble, keyboard
game.scrambler     // Scrambler — generate/convert move sequences
game.transition    // Transition — all UI animations (zoom, float, title…)
game.timer         // Timer — start / stop / reset / read elapsed time
game.preferences   // Preferences — Range sliders for size, flip, FOV, theme
game.scores        // Scores — per-size solve statistics
game.storage       // Storage — localStorage read/write
game.themes        // Themes — color palettes, setTheme()
game.themeEditor   // ThemeEditor — HSL color picker logic
game.world         // World — Three.js scene, camera, renderer, lights
```

### Useful game state

```ts
game.state        // current STATE value (0=Menu 1=Playing 2=Complete 3=Stats 4=Prefs 5=Theme)
game.saved        // boolean — whether a scrambled game is in progress
game.newGame      // boolean — true between scramble finish and first move
```

### Keyboard integration example

Wire `keyboardMove` directly from an Angular `(keydown)` handler or `HostListener`:

```ts
import { getGame, LAYER_MOVE, CUBE_MOVE } from './code';
import * as THREE from 'three';

function handleKey(event: KeyboardEvent) {
  const game = getGame();
  if (!game) return;

  const map: Record<string, { type: string; axis: string; angle: number; position?: THREE.Vector3 }> = {
    // Rotate whole cube
    ArrowLeft:  { type: CUBE_MOVE,  axis: 'y', angle:  Math.PI / 2 },
    ArrowRight: { type: CUBE_MOVE,  axis: 'y', angle: -Math.PI / 2 },
    ArrowUp:    { type: CUBE_MOVE,  axis: 'x', angle:  Math.PI / 2 },
    ArrowDown:  { type: CUBE_MOVE,  axis: 'x', angle: -Math.PI / 2 },
    // Rotate U layer on U/D keys when Shift is held
    'U': { type: LAYER_MOVE, axis: 'y', angle:  Math.PI / 2, position: new THREE.Vector3(0, 1, 0) },
    'u': { type: LAYER_MOVE, axis: 'y', angle: -Math.PI / 2, position: new THREE.Vector3(0, 1, 0) },
  };

  const move = map[event.key];
  if (!move) return;

  game.controls.keyboardMove(move.type, move, () => {
    // optional: called after animation completes
  });
}
```

---

## Architecture overview

```
initializeRubikGame()
│
├── expandRangeTags()          DOM: replace <range> custom tags with .range divs
│
└── new Game()
    ├── World                  Three.js scene + camera + renderer + lights
    ├── Cube                   piece geometry, colors, scramble state
    ├── Controls               Draggable input, raycasting, layer selection, keyboardMove()
    ├── Scrambler              move generation + notation conversion
    ├── Transition             all CSS/Three.js UI animations via Tween
    ├── Timer (Animation)      rAF-driven elapsed time
    ├── Preferences            Range sliders wired to game settings
    ├── Scores                 solve history per cube size
    ├── Storage                localStorage persistence
    ├── Confetti               particle celebration effect
    ├── Themes                 color palettes
    └── ThemeEditor            HSL color picker

Animation Engine (singleton rAF loop)
├── World.update()             → renderer.render()
├── Timer.update()             → elapsed time text
├── Tween.update()             → interpolates any numeric property
└── ConfettiStage.update()     → particle positions
```
