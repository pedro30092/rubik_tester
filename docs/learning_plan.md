# Learning Mode — Implementation Plan

> **Scope:** CFOP / Fridrich-reduced only. This plan covers the full feature tree
> but scopes the first implementation to **F2L → Basic → Algorithm_A**.  
> All cube logic uses `src/cube-engine/cube-engine.ts` exclusively.
> Read alongside `src/cube-engine/README.md`.

---

## 1. Visual Layout

The `/learning` route replaces the current minimal aside with a **split view**:

```
┌──────────────────────────┬────────────────┐
│                          │                │
│   Cube (60 % width)      │  Side Panel    │
│   [full-height canvas]   │  (40 % width)  │
│                          │                │
└──────────────────────────┴────────────────┘
```

- The **Cube** column owns a `<div>` container into which `World` appends its
  WebGL canvas automatically. The `Learning` component wires `AnimationEngine`,
  `World`, `RubikCube`, `Controls` from `cube-engine.ts` directly.
- The **Side Panel** is a new standalone Angular component.
- Both columns share the full viewport height; no scrolling on the cube side.

---

## 2. Component Tree

```
Learning                          ← existing route component, becomes layout host
│                                   owns: engine, world, rubikCube, controls
│                                   signals: selectedStep, selectedCategory, selectedAlgorithm
├── [div.learning__cube]          ← 60 % left — World renders its canvas here
└── LearningPanel                 ← new component — 40 % right side
    ├── PanelHeader               ← tab strip: "Algorithms" | "Settings"
    ├── AlgorithmsSection         ← active by default
    │   ├── StepSelector          ← Crux / F2L / OLL / PLL chips
    │   ├── CategorySelector      ← Basic / White Lateral / White Up (shown after step pick)
    │   └── AlgorithmGrid         ← card list (shown after category pick)
    │       └── AlgorithmCard[]   ← mini cube preview + label + "Practice" button
    └── SettingsSection           ← speed, face orientation (TBD)
```

All navigation state lives as Angular Signals inside `Learning` and flows down
as `@Input()` to child components.

---

## 3. Algorithm Data Model

A single TypeScript config file drives the entire tree.

```ts
// src/app/learning/algorithms.config.ts

export type AlgorithmId = string;  // e.g. 'f2l-basic-a'

export interface AlgorithmConfig {
  id: AlgorithmId;
  label: string;          // 'Algorithm A'
  notation: string[];     // ['R', 'U', "R'", "U'"] — the SOLVE moves (array, not string)
  // Preview cube shows the UNSOLVED state = invertAlgorithm(notation) applied to a solved cube
  preview: {
    cameraAngle?: 'front' | 'top' | 'corner';
  };
}

export interface CategoryConfig {
  id: string;
  label: string;
  algorithms: AlgorithmConfig[];
}

export interface StepConfig {
  id: string;
  label: string;   // 'F2L'
  name: string;    // 'First Two Layers'
  categories: CategoryConfig[];
}

export const LEARNING_STEPS: StepConfig[] = [
  {
    id: 'f2l',
    label: 'F2L',
    name: 'First Two Layers',
    categories: [
      {
        id: 'basic',
        label: 'Basic',
        algorithms: [
          {
            id: 'f2l-basic-a',
            label: 'Algorithm A',
            notation: ['R', 'U', "R'", "U'"],   // placeholder — replace with real F2L alg
            preview: { cameraAngle: 'corner' },
          },
          { id: 'f2l-basic-b', label: 'Algorithm B', notation: [], preview: {} },
          { id: 'f2l-basic-c', label: 'Algorithm C', notation: [], preview: {} },
          { id: 'f2l-basic-d', label: 'Algorithm D', notation: [], preview: {} },
        ],
      },
      { id: 'white-lateral', label: 'White Lateral', algorithms: [] },
      { id: 'white-up',      label: 'White Up',      algorithms: [] },
    ],
  },
  { id: 'crux', label: 'Crux', name: 'Cross', categories: [] },
  { id: 'oll',  label: 'OLL',  name: 'Orient Last Layer', categories: [] },
  { id: 'pll',  label: 'PLL',  name: 'Permutate Last Layer', categories: [] },
];
```

### Algorithm Inversion Helper

`controls.applyAlgorithm()` takes `string[]`, so the helper returns `string[]`.

```ts
// src/app/learning/algorithm-utils.ts

const INVERSE: Record<string, string> = {
  "R": "R'", "R'": "R",
  "U": "U'", "U'": "U",
  "L": "L'", "L'": "L",
  "D": "D'", "D'": "D",
  "F": "F'", "F'": "F",
  "B": "B'", "B'": "B",
};

export function invertAlgorithm(notation: string[]): string[] {
  return [...notation].reverse().map(m => INVERSE[m] ?? m);
}
```

---

## 4. Main Cube Wiring (inside `Learning` component)

The `Learning` component owns the engine lifecycle for the main cube.
Follows the wiring order from `src/cube-engine/README.md §12` exactly.

```ts
// learning.ts — ngAfterViewInit
import { AnimationEngine, World, RubikCube, Controls } from '../../cube-engine/cube-engine';

ngAfterViewInit(): void {
  const container = this.cubeContainerRef.nativeElement;  // ViewChild div
  const engine    = new AnimationEngine();
  const world     = new World(engine, container);
  const context   = { engine, world };

  this.rubikCube  = new RubikCube(context);  context.cube = this.rubikCube;
  this.controls   = new Controls(context);   context.controls = this.controls;

  this.rubikCube.init();
  this.rubikCube.object.add(this.controls.group);  // must follow every init()
  this.controls.enable();
}

ngOnDestroy(): void {
  this.world?.dispose();   // stops RAF loop, removes resize listener, cleans WebGL
}
```

---

## 5. Mini Cube Preview (`AlgorithmCard`)

Each card shows its own isolated Three.js cube representing the unsolved state.

### How it works

1. `AlgorithmCard` receives `@Input() config: AlgorithmConfig`.
2. It has its own `<div #previewContainer>` (≈120 × 90 px inside the card).
3. On `ngAfterViewInit` it creates its own independent stack:

```ts
// algorithm-card.ts — ngAfterViewInit
import { AnimationEngine, World, RubikCube, Controls } from '../../../cube-engine/cube-engine';
import { invertAlgorithm } from '../algorithm-utils';

ngAfterViewInit(): void {
  const container = this.previewContainerRef.nativeElement;
  const engine    = new AnimationEngine();
  const world     = new World(engine, container);
  const context   = { engine, world };

  const rubikCube = new RubikCube(context);  context.cube = rubikCube;
  const controls  = new Controls(context);   context.controls = controls;

  rubikCube.init();
  rubikCube.object.add(controls.group);   // wiring invariant
  controls.enable();

  // Apply inverse algorithm to show the puzzle in its unsolved state
  controls.applyAlgorithm(invertAlgorithm(this.config.notation));
}

ngOnDestroy(): void {
  this.world?.dispose();  // World.dispose() stops RAF + removes WebGL canvas
}
```

4. Optional: after the setup animation completes, loop the solve and re-setup on
   an interval to create a living animation in the card.

### Key points

- Each card's `AnimationEngine` is **fully independent** from the main cube's engine.
- `World.dispose()` (already implemented in `cube-engine.ts`) handles all cleanup.
- `controls.applyAlgorithm(string[])` is the correct signature — it takes an array,
  not a space-separated string.

### Card Design

- Card size: ~140 × 190 px.
- Top ~60 %: the `<div>` that World renders into.
- Bottom ~40 %: algorithm label + "Practice" button.
- Dark game-like styling: rounded corners, subtle glow border on hover/selected.

---

## 6. Algorithm Selection Flow

When the user clicks "Practice" on an `AlgorithmCard`:

```
User clicks "Practice" on Algorithm_A
        │
        ▼
Learning component receives selectedAlgorithm signal update
        │
        ▼
Main cube controls.disable()  — block user input during setup
        │
        ▼
rubikCube.reset()             — zeros all rotations (holder/animator/object)
                                method already exists in RubikCube
        │
        ▼
controls.applyAlgorithm(invertAlgorithm(algo.notation))
        — queues the setup moves one after another
        — each move waits for the previous animation to complete
        │
        ▼ (when last move completes — via onMove callback chain)
controls.enable()
Show brief overlay/toast: "Algorithm A — ready to practice!"
        │
        ▼
User physically practices the solve moves on the main cube
```

### Reset + Setup utility

```ts
// inside Learning component
import { invertAlgorithm } from './algorithm-utils';

private setupAlgorithm(algo: AlgorithmConfig): void {
  this.controls.disable();
  this.rubikCube.reset();

  const setupMoves = invertAlgorithm(algo.notation);

  // applyAlgorithm chains moves internally; tap onMove to know when done
  const originalOnMove = this.controls.onMove;
  let movesLeft = setupMoves.length;

  this.controls.onMove = () => {
    movesLeft--;
    if (movesLeft === 0) {
      this.controls.onMove = originalOnMove;
      this.controls.enable();
      this.showReadyToast(algo.label);
    }
  };

  this.controls.applyAlgorithm(setupMoves);
}
```

---

## 7. Settings Panel (TBD)

Planned controls for a future phase:

| Setting | Control | Notes |
|---|---|---|
| Animation speed | Range slider | `Controls.flipConfig` is currently `private`. Needs a public setter or method added to `cube-engine.ts` Controls class before this can be wired. Values: 0 = fast (125ms), 1 = smooth (200ms), 2 = bouncy (300ms). |
| Face colors | Color pickers | `rubikCube.updateColors(colors)` — `colors` is `CubeColors` with numeric hex values. `CubeColors` and `DEFAULT_CUBE_COLORS` are not currently exported from `cube-engine.ts`; they need to be exported. |
| Starting orientation | Axis presets | `rubikCube.rotateCube(axis, angle)` — already public. |

---

## 8. UI / Design Direction

- **Color palette:** Dark background (`#08101A` — cube body color), light text,
  step-themed accent colors (e.g. yellow for F2L, green for OLL).
- **Step chips:** pill buttons — large acronym, full name below in small text.
  Selected chip gets a bright fill.
- **Category chips:** smaller secondary pill row below the step row.
- **Algorithm cards:** 2-column grid, dark card surface, mini Three.js canvas as
  the visual, label and CTA below, hover lifts with a shadow.
- **No Three.js for button interactions** — CSS transitions are sufficient.
  Reserve Three.js for the actual cube previews inside the cards.

---

## 9. Implementation Phases

> Each phase is scoped to fit within a single chat context.

### Phase 1 — Layout & Shell ✅ DONE (2026-06-19)

- Rework `Learning` into a two-column layout (60/40 split via CSS flex).
- Wire `AnimationEngine + World + RubikCube + Controls` from `cube-engine.ts`
  inside `Learning.ngAfterViewInit()` to the left column container.
- Create `LearningPanel` shell component with the "Algorithms / Settings" tab strip.
- Wire `StepSelector` with the 4 hard-coded CFOP step chips.
- Handle `ngOnDestroy` cleanup via `world.dispose()`.

**Files created:**
- `src/app/learning/algorithms.config.ts` — data model (`StepConfig`, `CategoryConfig`, `AlgorithmConfig`, `LEARNING_STEPS`)
- `src/app/learning/algorithm-utils.ts` — `invertAlgorithm()` helper
- `src/app/learning/learning-panel/learning-panel.{ts,html,scss}` — tab shell
- `src/app/learning/learning-panel/step-selector/` — CFOP step chips

### Phase 2 — Algorithm Tree Navigation ✅ DONE (2026-06-19)

- Added `CategorySelector` (appears after a step is picked).
- Added `AlgorithmGrid` (appears after a category is picked).
- All navigation as Angular Signals inside `Learning`, passed as `@Input()`.
- Source data from `algorithms.config.ts`.

**Files created:**
- `src/app/learning/learning-panel/category-selector/`
- `src/app/learning/learning-panel/algorithm-grid/`

### Phase 3 — Mini Cube Previews ✅ DONE (2026-06-19)

- Implemented `AlgorithmCard` with its own isolated `AnimationEngine + World +
  RubikCube + Controls` stack.
- Apply `invertAlgorithm()` on init to show the unsolved state.
- Handle `ngOnDestroy` RAF cleanup via `world.dispose()`.

**Key finding:** `context` kept as a local variable in `ngAfterViewInit` (not
a class field) to avoid unused-field warnings — `world` is the only field
needed for cleanup.

**Files created:**
- `src/app/learning/learning-panel/algorithm-grid/algorithm-card/`

### Phase 4 — Algorithm Selection on Main Cube ✅ DONE (2026-06-19)

- Wire the "Practice" button to `setupAlgorithm()` in `Learning`.
- Uses `rubikCube.init()` + `rubikCube.object.add(controls.group)` to fully
  restore the solved state (not just `reset()` which only zeros rotations).
- `controls.applyAlgorithm(invertAlgorithm(notation))` queues setup moves.
- Toast notification shown after setup completes (auto-dismisses in 2.8 s).

**Key finding:** `rubikCube.reset()` only zeros `holder/object/animator`
rotations. To restore the cube to the **solved piece layout**, call
`rubikCube.init()` followed by `rubikCube.object.add(controls.group)`.
The `controls.group` invariant must be re-applied after every `init()` call.

### Phase 5 — Settings Panel ✅ DONE (2026-06-19)

- Exported `CubeColors` and `DEFAULT_CUBE_COLORS` from `cube-engine.ts`.
- Added `setSpeed(config: 0 | 1 | 2): void` to `Controls` class.
- Created `SettingsSection` component with:
  - **Speed:** 3-button toggle (Fast 125 ms / Smooth 200 ms / Bouncy 300 ms)
  - **Face colors:** 7 color swatches (U/D/F/R/B/L + Plastic body) using native
    `input[type="color"]` overlaid inside a styled preview well — no custom
    color picker library needed.
- Events bubble as `speedChanged: SpeedPreset` and `colorChanged: ColorChange`
  through `LearningPanel` up to `Learning`, which owns `controls.setSpeed()` and
  `rubikCube.updateColors()`.
- `setupAlgorithm()` re-applies `currentColors()` after `init()` so user color
  customizations survive practice resets.

**Files created:**
- `src/app/learning/learning-panel/settings-section/`

**Files modified:**
- `src/cube-engine/cube-engine.ts` — exports + `setSpeed()` method
- `src/app/learning/learning-panel/learning-panel.{ts,html}` — new inputs/outputs
- `src/app/learning/learning.{ts,html}` — speed/color state + handlers

---

## 10. Key Constraints & Gotchas

| Concern | Detail |
|---|---|
| No `code.js` | The `Learning` route does **not** use `code.js` or anything from `src/app/code.ts`. All cube logic comes from `src/cube-engine/cube-engine.ts`. |
| `controls.group` invariant | After every `rubikCube.init()` call, re-add `controls.group` to `rubikCube.object`. See `src/cube-engine/README.md §12`. |
| `applyAlgorithm` signature | `controls.applyAlgorithm(notations: string[])` — takes an **array**, not a space-separated string. The `invertAlgorithm` helper must return `string[]`. |
| `flipConfig` is private | `Controls.flipConfig` cannot be set from outside currently. Phase 5 requires adding a public setter or method to `cube-engine.ts`. |
| `CubeColors` not exported | The `CubeColors` interface and `DEFAULT_CUBE_COLORS` constant are internal to `cube-engine.ts`. Phase 5 requires exporting them. |
| `updateColors` expects numbers | `CubeColors` fields are numeric hex values (e.g. `0xFFFFFF`), not strings. The uppercase-hex-string rule in CLAUDE.md applies to Angular/CSS; internal Three.js calls use numbers. |
| Mini cube RAF leaks | Each `AlgorithmCard` owns an `AnimationEngine`. `World.dispose()` stops the RAF loop and cleans up WebGL. Must call it in `ngOnDestroy`. |
| `controls.applyAlgorithm` requires `enable()` | `Controls.move()` is a no-op when `this.enabled = false`. Always call `controls.enable()` before running setup moves. |
| Route isolation | The `/learning` route manages its own cube entirely; it shares nothing with any other route. |
