# CLAUDE.md - Rubik's Cube Angular App

## Build and Test Commands
* **Development Server:** `npm run start` or `ng serve`
* **Run Tests:** `npm run test` or `npx vitest`
* **Code Formatting:** `npx prettier --write .`

## Project Context
* **App Description:** An Angular 21 application wrapping a self-contained 3D Rubik's Cube game engine (`code.js`) rendered via Three.js.
* **Tech Stack:** Angular 21, TypeScript 5.9, Three.js 0.184, Vitest 4, Prettier 3.

## Key Architecture & Components
* **`code.js` / `code.d.ts`:** The entire game engine. Never touch its internals. Only use its exported API (`initializeRubikGame`, `getGame`, `startGame`, `exitGame`, `rotateFace`, `rotateCube`, `applyAlgorithm`). See `CODE_API.md` for full reference.
* **`KeyboardHandlerService`:** Global keyboard listener. Owns the reactive `timerDisplay` signal and orchestrates scramble/solve shortcuts (`R` = scramble, `Space` = solve).
* **`Game` Component (`/game`):** Main game view. Calls `initializeRubikGame()` in `ngAfterViewInit`.
* **`Menu` Component:** Floating menu overlay. Routes to `/scramble` or `/learning`.
* **`Scramble` Component (`/scramble`):** Triggered when scrambling mid-game with the poof animation.
* **`Learning` Component (`/learning`):** Area to test move algorithms via `applyAlgorithm()`.
* **`src/cube-engine/README.md`:** Technical internals reference for the cube engine. Before implementing or evaluating any feature request touching the 3D layer (geometry, scene graph, animations, moves, scrambler, colors), read the relevant section of this file to check if the functionality already exists or can be enhanced. Sections of interest:
  * Colors / theming → §7 `updateColors()` and `DEFAULT_CUBE_COLORS` table
  * Move animations / easing feel → §9 `flipConfig` and `Tween`
  * Programmatic moves → §10 `Controls` public API and `MOVES` table
  * Scramble logic → §11 `Scrambler` public API
  * Scene hierarchy → §3 and §12 (wiring invariants)


### Routes
* `/` -> `Game` (default view)
* `/scramble` -> `Scramble`
* `/learning` -> `Learning`

## Code Style & Best Practices
* **Angular Standards:** Follow modern Angular practices (Signals, `inject()`, component-driven design). Avoid unnecessary abstractions.
* **Color Formatting:** Always use uppercase hexadecimal string format for colors (e.g., `#FFFFFF` instead of `0xffffff`).
* **Simplification:** Keep code straightforward, minimal, and highly readable.

## Execution & Security Constraints (CRITICAL)
* **Execution Rules:** **DO NOT** execute any terminal commands directly. If you need a command run, explicitly print the command in your response so the user can review and execute it safely.
* **File Constraints:** **DO NOT** suggest or make changes to any files inside the `.github/` directory (including `copilot-instructions.md`) unless explicitly requested.
* **Scope Constraints:** **DO NOT** modify `code.js` or `code.d.ts` internals. Only extend or modify the Angular layer.
* **Test Maintenance:** Ignore spec file changes or creation unless explicitly asked.
