# RubikCube — Technical Documentation

Technical reference for how the 3D Rubik's Cube is built inside
[`cube-engine.ts`](./cube-engine.ts). Covers the two geometry primitives, the
scene-graph hierarchy, the `RubikCube` builder, and the `Controls` system that
drives programmatic layer moves.

---

## Table of contents

1. [Mental model](#1-mental-model)
2. [Geometry primitives](#2-geometry-primitives)
3. [The scene-graph hierarchy](#3-the-scene-graph-hierarchy)
4. [`RubikCube` lifecycle](#4-rubikcube-lifecycle)
5. [`generatePositions()` — the grid](#5-generatepositions--the-grid)
6. [`generateModel()` — meshes & stickers](#6-generatemodel--meshes--stickers)
7. [`updateColors()` — painting faces](#7-updatecolors--painting-faces)
8. [`userData` contract](#8-userdata-contract)
9. [Easing & Tween — the animation system](#9-easing--tween--the-animation-system)
10. [Controls — programmatic moves](#10-controls--programmatic-moves)
11. [Wiring order & the `controls.group` invariant](#11-wiring-order--the-controlsgroup-invariant)
12. [Glossary](#12-glossary)

---

## 1. Mental model

The cube is **not a single mesh**. It is a tree of `Object3D` nodes:

- A 3×3×3 cube = **27 pieces** (`Object3D`s).
- Each piece holds **one grey rounded box** (the plastic body) plus **0–3
  colored stickers** (the visible face colors).
- Stickers only exist where a piece touches the outer surface. A center piece
  has 0 stickers; an edge piece has 2; a corner has 3.

All geometric complexity lives in two reusable shapes
(`RoundedBoxGeometry`, `RoundedPlaneGeometry`). Everything else is
**positioning math** — placing clones of those shapes on a normalized grid.

---

## 2. Geometry primitives

### `RoundedBoxGeometry` (class extends `THREE.BufferGeometry`)

A cube with uniformly rounded corners and edges, built vertex-by-vertex as a
raw buffer geometry. Direct port of
[three-rounded-box](https://github.com/pailhead/three-rounded-box).

**Signature:** `new RoundedBoxGeometry(size, radius, radiusSegments)`

- `size` — edge length of the box.
- `radius` — corner roundness as a **fraction of size** (internally multiplied
  by `size`, then clamped to at most half the smallest dimension).
- `radiusSegments` — tessellation of each rounded corner (higher = smoother).

**How it builds the mesh.** The constructor allocates `position` and `normal`
buffers, then runs six closure helpers that push triangle indices:

| Helper           | Builds                                              |
| ---------------- | --------------------------------------------------- |
| `doVertices()`   | All vertices — generates one corner's worth of arc points, then mirrors them across the 8 octants via a sign-flip lookup (`cornerLayout`). |
| `doCorners()`    | Triangles for the 8 spherical corners.              |
| `doFaces()`      | The 6 flat faces.                                   |
| `doHeightEdges()`| The 4 vertical rounded edges.                       |
| `doWidthEdges()` | The 4 horizontal rounded edges (width axis).        |
| `doDepthEdges()` | The 4 rounded edges along the depth axis.           |

These helpers are **inner functions, not methods** — deliberately. They share
~14 mutable locals (`cornerVerts`, `vertexPool`, `indices`, etc.) that are pure
construction-time scratch space with no meaning after the constructor returns.
Promoting them to methods would force either a 14-argument signature or 14
throwaway instance fields; closures over shared locals is the correct trade-off.

> **Port note:** `addAttribute` → `setAttribute` (deprecated in Three.js r125),
> and ES5 prototype-chain inheritance → a real `class extends`.

### `RoundedPlaneGeometry` (function)

A flat rounded square, extruded to a thin depth — this is the **sticker** shape.

**Signature:** `RoundedPlaneGeometry(size, radius, depth)`

It builds a `THREE.Shape` (a 2D path with `quadraticCurveTo` corners), then
extrudes it with `ExtrudeGeometry`. Returns a plain `BufferGeometry`, so it
stays a function rather than a class.

> **Port note:** `ExtrudeBufferGeometry` → `ExtrudeGeometry` (merged in r125).

---

## 3. The scene-graph hierarchy

`RubikCube` nests **three `Object3D` containers** between the scene and the
pieces. `Controls` adds a fourth node (`group`) as a temporary reparenting
target during moves.

```
world.scene
  └── holder          ← whole-cube orientation anchor
        └── animator  ← per-move rotation anchor (a slice spins here)
              └── object ← scaled container holding all 27 pieces + controls.group
                    ├── group (Controls)  ← active layer pieces move here during a move
                    ├── piece[0]   (Object3D)
                    │     ├── pieceCube   (grey RoundedBoxGeometry mesh)
                    │     ├── edge "L"   (RoundedPlaneGeometry sticker)
                    │     └── edge "B"
                    ├── piece[1] ...
                    └── piece[26]
```

Why three nested nodes instead of one:

- **`object`** carries the cube's overall **scale** (so a 2×2 vs 4×4 fills the
  same visual footprint).
- **`animator`** is available as a rotation anchor for whole-cube orientation.
- **`holder`** is rotated to reorient the entire cube in space.

The constructor wires this chain once and adds `holder` to the scene:

```ts
this.holder.add(this.animator);
this.animator.add(this.object);
this.context.world.scene.add(this.holder);
```

`context` is a `GameContext` — a bag (`{ engine, world, cube?, controls? }`)
that gives each system access to shared resources without direct cross-imports.

---

## 4. `RubikCube` lifecycle

### `constructor(context)`

Builds the empty 3-node hierarchy and attaches it to the scene. **No pieces
yet.**

### `init()`

Builds (or rebuilds) the full visible cube:

1. Clear previous state (`object.clear()`, reset `cubes`).
2. Set `object.scale` from `size` (`2 → 1.25`, `3 → 1`, `>3 → 3/size`) so the
   cube always fills the same footprint.
3. `generatePositions()` → grid of slot positions.
4. `generateModel()` → mesh clones for each slot.
5. Push each piece into `object` and collect its body mesh into `cubes`.
6. `holder.traverse(... frustumCulled = false)` — disables frustum culling so
   pieces never vanish at the screen edge while rotating.
7. `updateColors(DEFAULT_CUBE_COLORS)` — paints everything.

> `object.clear()` removes ALL children — including `controls.group`. The
> caller must re-add `controls.group` to `object` after every `init()` call.
> See [§11](#11-wiring-order--the-controlsgroup-invariant).

### `reset()`

Zeros the rotation of all three container nodes — returns the cube to its
canonical orientation without rebuilding it.

### `loadFromData(data)`

Rebuilds the cube, then overrides each piece's position/rotation from saved
state (matched by `piece.name`). Used to restore an in-progress solve.

---

## 5. `generatePositions()` — the grid

Produces a flat array of slot positions, one per piece.

```ts
const m = this.size - 1;
const first = this.size % 2 !== 0
  ? -Math.floor(this.size / 2)   // odd: centered on 0 → -1, 0, 1
  : 0.5 - this.size / 2;         // even: offset by half → -0.5, 0.5
```

Three nested loops over `x, y, z ∈ [0, size)` create a `Vector3` at
`(first + x, first + y, first + z)`. For a 3×3×3 that's the 27 coordinates
where each axis ∈ `{-1, 0, 1}`.

Each position is tagged with an **`edges` array** — face indices `0–5` for the
faces it lies on:

| Condition  | Pushes | Face |
| ---------- | ------ | ---- |
| `x === 0`  | `0`    | L    |
| `x === m`  | `1`    | R    |
| `y === 0`  | `2`    | D    |
| `y === m`  | `3`    | U    |
| `z === 0`  | `4`    | B    |
| `z === m`  | `5`    | F    |

So a corner gets 3 entries, an edge 2, a center 1, and the hidden core 0.
This array drives exactly which stickers each piece receives.

> `CubePosition` is `THREE.Vector3 & { edges: number[] }` — a Vector3 with the
> extra tag bolted on, kept as a single object the way the original code does.

---

## 6. `generateModel()` — meshes & stickers

Creates the actual meshes. Two **template** geometries are made once and reused:

```ts
const pieceMesh    = new THREE.Mesh(new RoundedBoxGeometry(pieceSize, ...), mat.clone());
const edgeGeometry = RoundedPlaneGeometry(pieceSize, ...);  // shared sticker geometry
```

`pieceSize = 1/3`, so the assembled cube spans roughly 1 world unit.

For each grid position:

1. **Body:** clone `pieceMesh`, move it to `position / 3` (the grid coords are
   in `±1` units; dividing by 3 packs them into the `1/3`-sized lattice).
2. **Name:** `piece.name = String(index)` — its stable identity for save/load.
3. **Stickers:** for each face index in `position.edges`, create an edge mesh
   and place it flush on that face using three lookup tables indexed by the
   face number `0–5`:

   ```ts
   edge.position.set(                          //   L   R   D   U   B   F
     distance * [-1, 1,  0,  0,  0,  0][i],    // x: push along ±X for L/R
     distance * [ 0, 0, -1,  1,  0,  0][i],    // y: push along ±Y for D/U
     distance * [ 0, 0,  0,  0, -1,  1][i],    // z: push along ±Z for B/F
   );
   edge.rotation.set(
     (Math.PI / 2) * [ 0, 0, 1, -1, 0, 0][i],  // tilt D/U flat
     (Math.PI / 2) * [-1, 1, 0,  0, 2, 0][i],  // turn L/R/B to face outward
     0,
   );
   ```

   `distance = pieceSize / 2` puts the sticker exactly on the face surface.
   The sticker is scaled by `edgeScale` (0.82) so a thin gap of body shows
   around each color — the classic "grid line" look. Its `name` is set to the
   face letter (`FACE_NAMES[i]`), which is later used for coloring.

4. Store references on `userData` (see next section) and push to `pieces`.

`FACE_NAMES = ['L', 'R', 'D', 'U', 'B', 'F']` — index → letter, the inverse of
the table in `generatePositions()`.

---

## 7. `updateColors()` — painting faces

```ts
this.pieces.forEach(piece => bodyMesh.material.color.setHex(colors.P));
this.edges.forEach(edge  => edge.material.color.setHex(colors[edge.name]));
```

- Every piece **body** gets color `P` (near-black plastic).
- Every **sticker** is colored by looking up its `name` (`'U'`, `'R'`, …) in
  the color map. Because the sticker recorded its face letter as its `.name`
  in `generateModel()`, this is a direct dictionary lookup — no geometry math.

The color source is the hardcoded `DEFAULT_CUBE_COLORS` constant (ported from
`Themes.defaults.cube` in the original `main.js`):

| Key | Hex        | Face / role   |
| --- | ---------- | ------------- |
| `U` | `0xffffff` | white (up)    |
| `D` | `0xffef48` | yellow (down) |
| `F` | `0xef3923` | red (front)   |
| `R` | `0x41aac8` | blue (right)  |
| `B` | `0xff8c0a` | orange (back) |
| `L` | `0x82ca38` | green (left)  |
| `P` | `0x08101a` | piece body    |
| `G` | `0xd1d5db` | background (unused here) |

---

## 8. `userData` contract

Each piece stores three entries on Three.js's free-form `userData` bag:

| Key      | Value                                   | Used by |
| -------- | --------------------------------------- | ------- |
| `cube`   | the body `Mesh`                         | `init()` / `updateColors()` |
| `edges`  | `string[]` of this piece's face letters | Controls — which faces a piece exposes |
| `start`  | `{ position, rotation }` clones         | reset / solve-detection |

`init()` collects every `userData.cube` into the flat `cubes` array for fast
iteration; `pieces` and `edges` are likewise flat arrays of all bodies and all
stickers across the whole cube.

---

## 9. Easing & Tween — the animation system

### `Easing`

A collection of pure easing functions, each returning `(t: number) => number`
where `t ∈ [0, 1]`. Three families are used by Controls:

| Preset             | Character                        | `flipConfig` |
| ------------------ | -------------------------------- | ------------ |
| `Power.Out(3)`     | Fast cubic snap — 125 ms         | `0` (default) |
| `Sine.Out()`       | Smooth sinusoidal — 200 ms       | `1` |
| `Back.Out(1.5)`    | Slight bounce at end — 300 ms    | `2` |

To change the move feel, set `flipConfig` on `Controls`:
```ts
controls.flipConfig = 1; // smooth sine
```

### `Tween` (extends `Animation`)

Drives a single timed animation through the shared `AnimationEngine` RAF loop.

**Key properties consumed by `Controls.rotateLayer()`:**
- `tween.delta` — how much the eased value changed since the last frame. Used
  to compute `rotateOnAxis` increments so the total rotation stays exact.
- `tween.value` — the current eased value `∈ [0, 1]`.

`Tween` is created, runs until `progress >= 1`, fires `onComplete`, then
removes itself from the engine. No cleanup needed by the caller.

> `Draggable` (the original pointer-event class) has **zero connection** to
> smooth transitions. The easing is entirely `Tween` + `AnimationEngine`.

---

## 10. Controls — programmatic moves

`Controls` translates a notation string (`'L'`, `"R'"`, `'U'`, …) into an
animated layer rotation. It is the only public API needed to move the cube
from buttons or external code.

### Public API

```ts
controls.move('L');          // clockwise L face
controls.move("R'");         // counter-clockwise R face
controls.move('U', () => {}); // with completion callback
```

`move()` returns `false` and is a no-op if another move is animating or
`Controls` is disabled.

### How a move works internally

```
move('L')
  │
  ├─ MOVES['L'] → { position: (-1,0,0), axis: 'x', angle: +π/2 }
  │
  ├─ getLayer(position)
  │     Scans cube.pieces, finds the 9 whose x-position matches → string[]
  │
  ├─ selectLayer(layer)
  │     Reparents those 9 pieces: cube.object → controls.group
  │     Resets group.rotation to (0,0,0)
  │
  ├─ rotateLayer(angle, callback)
  │     Creates a Tween; each frame: group.rotateOnAxis(flipAxis, tween.delta * angle)
  │     onComplete: snaps rotations to exact multiples of π/2,
  │                 calls deselectLayer()
  │
  └─ deselectLayer(layer)
        Reparents pieces back: controls.group → cube.object
        Preserves world transform via applyMatrix4 + invert()
```

### Three.js r184 API fixes vs. original `main.js`

| Original                             | Ported                                      |
| ------------------------------------ | ------------------------------------------- |
| `piece.applyMatrix(m)`               | `piece.applyMatrix4(m)`                     |
| `new THREE.Matrix4().getInverse(m)`  | `new THREE.Matrix4().copy(m).invert()`      |
| `euler.toVector3()`                  | `new THREE.Vector3(e.x, e.y, e.z)` (helper `eulerToVector3`) |

### `MOVES` table

The complete notation-to-descriptor map. All 12 standard face moves (6 faces × clockwise/prime):

| Move | Position   | Axis | Angle  |
| ---- | ---------- | ---- | ------ |
| `R`  | `(1,0,0)`  | x    | −π/2   |
| `R'` | `(1,0,0)`  | x    | +π/2   |
| `L`  | `(-1,0,0)` | x    | +π/2   |
| `L'` | `(-1,0,0)` | x    | −π/2   |
| `U`  | `(0,1,0)`  | y    | −π/2   |
| `U'` | `(0,1,0)`  | y    | +π/2   |
| `D`  | `(0,-1,0)` | y    | +π/2   |
| `D'` | `(0,-1,0)` | y    | −π/2   |
| `F`  | `(0,0,1)`  | z    | −π/2   |
| `F'` | `(0,0,1)`  | z    | +π/2   |
| `B`  | `(0,0,-1)` | z    | +π/2   |
| `B'` | `(0,0,-1)` | z    | −π/2   |

---

## 11. Wiring order & the `controls.group` invariant

**The problem.** `RubikCube.init()` calls `object.clear()`, which removes ALL
children — including `controls.group`. If `group` is not re-added, pieces
reparented into it during a move disappear from the scene.

**The rule.** After every `init()` call, `controls.group` must be re-added to
`cube.object`:

```ts
// cube.ts — ngAfterViewInit
this.engine   = new AnimationEngine();
this.world    = new World(this.engine, this.containerRef.nativeElement);

this.context  = { engine: this.engine, world: this.world };

this.rubikCube = new RubikCube(this.context);
this.context.cube = this.rubikCube;

this.controls = new Controls(this.context);
this.context.controls = this.controls;

this.rubikCube.init();
this.rubikCube.object.add(this.controls.group); // ← must follow every init()
this.controls.enable();
```

**Why `Controls` is created before `init()`.** `Controls` adds `group` to
`object` in its constructor. `init()` clears it. The re-add after `init()` is
the deliberate fix — not moving the line into the constructor, because any
future `init()` call (e.g. size change) would strip the group again.

---

## 12. Glossary

| Term               | Meaning |
| ------------------ | ------- |
| **piece**          | One `Object3D` = one cubie (body + its stickers). |
| **body / cube**    | The grey `RoundedBoxGeometry` mesh inside a piece. |
| **edge / sticker** | A colored `RoundedPlaneGeometry` mesh on a face. (Note: "edge" here means *sticker face*, not the cube-theory "edge piece".) |
| **holder / animator / object** | The three nested rotation-anchor containers. |
| **group**          | `Controls`'s temporary reparenting node; pieces move here during an animated layer rotation. |
| **`GameContext`**  | `{ engine, world, cube?, controls? }` bag wired incrementally in `cube.ts`. |
| **`flipConfig`**   | Index `0–2` selecting the easing preset and duration for layer moves. |
| **`frustumCulled`**| Three.js flag; disabled so pieces never disappear at screen edges mid-rotation. |
