# Copilot Instructions

## What this app is

An Angular 21 app that wraps a self-contained 3D Rubik's Cube game engine (`code.js`) rendered via Three.js.

## Key concepts

- **`code.js` / `code.d.ts`** — the entire game engine. Angular never touches its internals. Only use its exported API (`initializeRubikGame`, `getGame`, `startGame`, `exitGame`, `rotateFace`, `rotateCube`, `applyAlgorithm`). See `CODE_API.md` for the full reference.
- **`KeyboardHandlerService`** — global keyboard listener, owns the reactive `timerDisplay` signal and orchestrates scramble/solve shortcuts (`R` = scramble, `Space` = solve).
- **`Game` component** (`/game`) — main game view; calls `initializeRubikGame()` in `ngAfterViewInit`.
- **`Menu` component** — floating menu overlay; routes to `/scramble` or `/learning`.
- **`Scramble` component** (`/scramble`) — triggered when scrambling mid-game with the poof animation.
- **`Learning` component** (`/learning`) — area to test move algorithms via `applyAlgorithm()`.

## Routes

| Path | Component |
|---|---|
| `/` | `Game` (default) |
| `/scramble` | `Scramble` |
| `/learning` | `Learning` |

## Tech stack

- Angular 21, TypeScript 5.9, Three.js 0.184, Vitest 4, Prettier 3

## Things to consider

- When using some kind of color in hexadecimal format transform it to use uppercase letters (e.g., `#FFFFFF` instead of `0xffffff`).

## Dev notes

- We are in development — ignore spec file changes unless explicitly asked.
- Keep code simple. Apply Angular best practices (signals, inject(), no unnecessary abstractions).
- Do not modify `code.js` internals; only extend the Angular layer.
- DO NOT SUGGEST any command exection, if you require something, give me the command AND I WILL GIVE YOU the results if the command is secure.

## IMPORTANT: Do not suggest or do any change to the .github files UNLESS I explicitly ask you to. This includes the MD files such as copilot-instructions.md.