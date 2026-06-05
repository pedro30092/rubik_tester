# RubikTester

An Angular application that wraps a fully-featured 3D Rubik's Cube game engine. The game renders via [Three.js](https://threejs.org/) and exposes a clean JavaScript API consumed by Angular components and services.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 |
| 3D Rendering | Three.js 0.184 |
| Language | TypeScript 5.9 |
| Unit Tests | Vitest 4 |
| Formatter | Prettier 3 |

## Architecture

```
src/app/
├── code.js / code.d.ts      — Self-contained game engine (Three.js scene, cube logic, animations)
├── app.ts                   — Root Angular component; bootstraps the game in ngAfterViewInit
├── app.html                 — Template: game canvas + UI overlay (timer, preferences, stats, theme)
├── app.css                  — Component styles
└── keyboard-handler.service.ts — Angular service: keyboard shortcuts, Angular-owned timer signal, poof overlay
```

### Game Engine (`code.js`)

`code.js` is an ES module that owns the entire game loop. Angular never touches its internals directly — it only uses the exported public API. Internal subsystems:

```
Game
├── World          — Three.js scene, camera, renderer, lights
├── Cube           — Piece geometry, colors, solved/scrambled state
├── Controls       — Drag input, raycasting, layer selection, keyboardMove()
├── Scrambler      — Move generation and standard notation conversion
├── Transition     — CSS/Three.js UI animations via Tween
├── Timer          — rAF-driven elapsed time
├── Preferences    — Range sliders wired to game settings
├── Scores         — Solve history per cube size
├── Storage        — localStorage persistence
├── Confetti       — Particle celebration effect on solve
├── Themes         — Color palettes (Cube, Erno, Dust, Camo, Rain)
└── ThemeEditor    — HSL color picker
```

### Angular Layer

- **`App` component** — calls `initializeRubikGame()` after the view is ready, then delegates to `KeyboardHandlerService`.
- **`KeyboardHandlerService`** — registers a global `keydown` listener, monkey-patches `game.timer` to respect Angular's `timerEnabled` signal, drives a reactive `timerDisplay` signal updated every 100 ms, and orchestrates "poof" overlay animations for scramble (`R`) and instant-solve (`Space`) shortcuts.

## Game Features

- **Cube sizes**: 2×2×2 up to 5×5×5
- **Mouse / touch drag** controls for rotating layers
- **Keyboard shortcuts** (while playing):
  - `R` — scramble to a new random position
  - `Space` — instantly solve the cube
  - Arrow keys — rotate the whole cube
- **Scramble animation** with configurable length (20 / 25 / 30 moves)
- **Timer** with best/worst/average statistics stored in `localStorage`
- **Preferences panel**: cube size, flip type, scramble length, camera FOV
- **Theme picker**: 5 presets + custom HSL editor
- **Confetti** celebration on solve completion

## Public API (`code.js`)

See [CODE_API.md](CODE_API.md) for the full reference. Key exports:

```ts
initializeRubikGame()            // create singleton Game, start intro animation
getGame()                        // access the Game instance

startGame()                      // scramble + zoom in → Playing state
exitGame()                       // zoom out → Menu state

rotateFace("R")                  // rotate Right face clockwise (standard notation)
rotateFace("U'", callback)       // rotate Up face CCW, fire callback on complete
rotateCube('y', Math.PI / 2)    // rotate whole cube 90° around Y axis
applyAlgorithm("R U R' U'")     // execute a move sequence, one animation at a time
```

Supported notation: `U U' D D' R R' L L' F F' B B'`

## Development

### Start dev server

```bash
ng serve
# → http://localhost:4200/
```

### Build

```bash
ng build
# Artifacts in dist/
```

### Run unit tests

```bash
ng test
```

Tests use [Vitest](https://vitest.dev/) with [jsdom](https://github.com/jsdom/jsdom).

## Scaffolding (Angular CLI)

```bash
ng generate component component-name
ng generate --help   # full list of schematics
```

## End-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
