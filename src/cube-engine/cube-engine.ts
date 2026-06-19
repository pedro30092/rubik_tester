import * as THREE from 'three';

// ─── Geometry ────────────────────────────────────────────────────────────────

/**
 * A cube with uniformly rounded corners, built as a raw BufferGeometry.
 * Direct TypeScript port of https://github.com/pailhead/three-rounded-box.
 *
 * API changes vs. the original JS:
 *   - `this.addAttribute` → `this.setAttribute` (deprecated in r125)
 *   - ES5 prototype-chain inheritance → `class extends THREE.BufferGeometry`
 */
export class RoundedBoxGeometry extends THREE.BufferGeometry {
  constructor(size: number, radius: number, radiusSegments: number) {
    super();

    radiusSegments = !isNaN(radiusSegments) ? Math.max(1, Math.floor(radiusSegments)) : 1;

    const width = size,
      height = size,
      depth = size;
    radius = size * radius;
    radius = Math.min(radius, Math.min(width, Math.min(height, depth)) / 2);

    const edgeHalfWidth = width / 2 - radius;
    const edgeHalfHeight = height / 2 - radius;
    const edgeHalfDepth = depth / 2 - radius;

    const rs1 = radiusSegments + 1;
    const totalVertexCount = (rs1 * radiusSegments + 1) << 3;

    const positions = new THREE.BufferAttribute(new Float32Array(totalVertexCount * 3), 3);
    const normals = new THREE.BufferAttribute(new Float32Array(totalVertexCount * 3), 3);

    const cornerVerts: THREE.Vector3[][] = [];
    const cornerNormals: THREE.Vector3[][] = [];
    const vertex = new THREE.Vector3();
    const vertexPool: THREE.Vector3[] = [];
    const normalPool: THREE.Vector3[] = [];
    const indices: number[] = [];

    const lastVertex = rs1 * radiusSegments;
    const cornerVertNumber = rs1 * radiusSegments + 1;

    /**
     * TECHNICAL EXPLANATION - Why we use functions instead of private methods:
     * The reason they're inside the constructor comes down to what they all share: constructor-local mutable state.
     *
     * Look at everything doVertices reads and writes:
     * radiusSegments, rs1, radius, edgeHalfWidth/Height/Depth, cornerVerts, cornerNormals, vertex, vertexPool, normalPool, indices, lastVertex, cornerVertNumber — roughly 14 variables.
     *
     * If you move doVertices to a private method, that state has to go somewhere.
     *
     * The inner-function pattern is actually the correct choice here: it's a local builder where the sub-routines are closures over shared mutable locals.
     * The geometry is fully committed to the BufferGeometry base at the end (setAttribute, setIndex), and the scratch state is GC'd when the constructor returns.
     * The only reason to prefer private methods is if you wanted to test each sub-routine in isolation — but since these are pure geometry helpers with no observable side effects outside the constructor, there's no practical testing benefit either.
     */
    doVertices();
    doFaces();
    doCorners();
    doHeightEdges();
    doWidthEdges();
    doDepthEdges();

    function doVertices() {
      const cornerLayout = [
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(1, 1, -1),
        new THREE.Vector3(-1, 1, -1),
        new THREE.Vector3(-1, 1, 1),
        new THREE.Vector3(1, -1, 1),
        new THREE.Vector3(1, -1, -1),
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(-1, -1, 1),
      ];

      for (let j = 0; j < 8; j++) {
        cornerVerts.push([]);
        cornerNormals.push([]);
      }

      const PIhalf = Math.PI / 2;
      const cornerOffset = new THREE.Vector3(edgeHalfWidth, edgeHalfHeight, edgeHalfDepth);

      for (let y = 0; y <= radiusSegments; y++) {
        const v = y / radiusSegments;
        const va = v * PIhalf;
        const cosVa = Math.cos(va);
        const sinVa = Math.sin(va);

        if (y === radiusSegments) {
          vertex.set(0, 1, 0);
          const vert = vertex.clone().multiplyScalar(radius).add(cornerOffset);
          cornerVerts[0].push(vert);
          vertexPool.push(vert);
          const norm = vertex.clone();
          cornerNormals[0].push(norm);
          normalPool.push(norm);
          continue;
        }

        for (let x = 0; x <= radiusSegments; x++) {
          const u = x / radiusSegments;
          const ha = u * PIhalf;
          vertex.x = cosVa * Math.cos(ha);
          vertex.y = sinVa;
          vertex.z = cosVa * Math.sin(ha);

          const vert = vertex.clone().multiplyScalar(radius).add(cornerOffset);
          cornerVerts[0].push(vert);
          vertexPool.push(vert);

          const norm = vertex.clone().normalize();
          cornerNormals[0].push(norm);
          normalPool.push(norm);
        }
      }

      for (let i = 1; i < 8; i++) {
        for (let j = 0; j < cornerVerts[0].length; j++) {
          const vert = cornerVerts[0][j].clone().multiply(cornerLayout[i]);
          cornerVerts[i].push(vert);
          vertexPool.push(vert);
          const norm = cornerNormals[0][j].clone().multiply(cornerLayout[i]);
          cornerNormals[i].push(norm);
          normalPool.push(norm);
        }
      }
    }

    function doCorners() {
      const flips = [true, false, true, false, false, true, false, true];
      const lastRowOffset = rs1 * (radiusSegments - 1);

      for (let i = 0; i < 8; i++) {
        const cornerOffset = cornerVertNumber * i;

        for (let v = 0; v < radiusSegments - 1; v++) {
          const r1 = v * rs1;
          const r2 = (v + 1) * rs1;

          for (let u = 0; u < radiusSegments; u++) {
            const u1 = u + 1;
            const a = cornerOffset + r1 + u;
            const b = cornerOffset + r1 + u1;
            const c = cornerOffset + r2 + u;
            const d = cornerOffset + r2 + u1;

            if (!flips[i]) {
              indices.push(a, b, c, b, d, c);
            } else {
              indices.push(a, c, b, b, c, d);
            }
          }
        }

        for (let u = 0; u < radiusSegments; u++) {
          const a = cornerOffset + lastRowOffset + u;
          const b = cornerOffset + lastRowOffset + u + 1;
          const c = cornerOffset + lastVertex;

          if (!flips[i]) {
            indices.push(a, b, c);
          } else {
            indices.push(a, c, b);
          }
        }
      }
    }

    function doFaces() {
      let a = lastVertex;
      let b = lastVertex + cornerVertNumber;
      let c = lastVertex + cornerVertNumber * 2;
      let d = lastVertex + cornerVertNumber * 3;
      indices.push(a, b, c, a, c, d);

      a = lastVertex + cornerVertNumber * 4;
      b = lastVertex + cornerVertNumber * 5;
      c = lastVertex + cornerVertNumber * 6;
      d = lastVertex + cornerVertNumber * 7;
      indices.push(a, c, b, a, d, c);

      a = 0;
      b = cornerVertNumber;
      c = cornerVertNumber * 4;
      d = cornerVertNumber * 5;
      indices.push(a, c, b, b, c, d);

      a = cornerVertNumber * 2;
      b = cornerVertNumber * 3;
      c = cornerVertNumber * 6;
      d = cornerVertNumber * 7;
      indices.push(a, c, b, b, c, d);

      a = radiusSegments;
      b = radiusSegments + cornerVertNumber * 3;
      c = radiusSegments + cornerVertNumber * 4;
      d = radiusSegments + cornerVertNumber * 7;
      indices.push(a, b, c, b, d, c);

      a = radiusSegments + cornerVertNumber;
      b = radiusSegments + cornerVertNumber * 2;
      c = radiusSegments + cornerVertNumber * 5;
      d = radiusSegments + cornerVertNumber * 6;
      indices.push(a, c, b, b, c, d);
    }

    function doHeightEdges() {
      for (let i = 0; i < 4; i++) {
        const cOffset = i * cornerVertNumber;
        const cRowOffset = 4 * cornerVertNumber + cOffset;
        const needsFlip = (i & 1) === 1;

        for (let u = 0; u < radiusSegments; u++) {
          const u1 = u + 1;
          const a = cOffset + u,
            b = cOffset + u1;
          const c = cRowOffset + u,
            d = cRowOffset + u1;

          if (!needsFlip) {
            indices.push(a, b, c, b, d, c);
          } else {
            indices.push(a, c, b, b, c, d);
          }
        }
      }
    }

    function doDepthEdges() {
      const cStarts = [0, 2, 4, 6];
      const cEnds = [1, 3, 5, 7];

      for (let i = 0; i < 4; i++) {
        const cStart = cornerVertNumber * cStarts[i];
        const cEnd = cornerVertNumber * cEnds[i];
        const needsFlip = 1 >= i;

        for (let u = 0; u < radiusSegments; u++) {
          const urs1 = u * rs1;
          const u1rs1 = (u + 1) * rs1;
          const a = cStart + urs1,
            b = cStart + u1rs1;
          const c = cEnd + urs1,
            d = cEnd + u1rs1;

          if (needsFlip) {
            indices.push(a, c, b, b, c, d);
          } else {
            indices.push(a, b, c, b, d, c);
          }
        }
      }
    }

    function doWidthEdges() {
      const end = radiusSegments - 1;
      const cStarts = [0, 1, 4, 5];
      const cEnds = [3, 2, 7, 6];
      const needsFlip = [0, 1, 1, 0];

      for (let i = 0; i < 4; i++) {
        const cStart = cStarts[i] * cornerVertNumber;
        const cEnd = cEnds[i] * cornerVertNumber;

        for (let u = 0; u <= end; u++) {
          const a = cStart + radiusSegments + u * rs1;
          const b = cStart + (u !== end ? radiusSegments + (u + 1) * rs1 : cornerVertNumber - 1);
          const c = cEnd + radiusSegments + u * rs1;
          const d = cEnd + (u !== end ? radiusSegments + (u + 1) * rs1 : cornerVertNumber - 1);

          if (!needsFlip[i]) {
            indices.push(a, b, c, b, d, c);
          } else {
            indices.push(a, c, b, b, c, d);
          }
        }
      }
    }

    let index = 0;
    for (let i = 0; i < vertexPool.length; i++) {
      positions.setXYZ(index, vertexPool[i].x, vertexPool[i].y, vertexPool[i].z);
      normals.setXYZ(index, normalPool[i].x, normalPool[i].y, normalPool[i].z);
      index++;
    }

    this.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    this.setAttribute('position', positions);
    this.setAttribute('normal', normals);
  }
}

/**
 * A flat rounded rectangle extruded to a thin depth, used for cube face stickers.
 * `ExtrudeBufferGeometry` was merged into `ExtrudeGeometry` in Three.js r125.
 */
export function RoundedPlaneGeometry(
  size: number,
  radius: number,
  depth: number,
): THREE.BufferGeometry {
  const x = -size / 2,
    y = -size / 2;
  const width = size,
    height = size;
  radius = size * radius;

  const shape = new THREE.Shape();
  shape.moveTo(x, y + radius);
  shape.lineTo(x, y + height - radius);
  shape.quadraticCurveTo(x, y + height, x + radius, y + height);
  shape.lineTo(x + width - radius, y + height);
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
  shape.lineTo(x + width, y + radius);
  shape.quadraticCurveTo(x + width, y, x + width - radius, y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x, y, x, y + radius);

  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 3 });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Contract for any object managed by AnimationEngine.
 * Implementors receive a delta (ms since last frame) on each tick.
 */
interface AnimationEngineItem {
  /** Assigned by AnimationEngine.add(); used as the lookup key. */
  animationId?: number;
  /** Called once per frame with the elapsed time in milliseconds. */
  update(delta: number): void;
}

/**
 * Singleton RAF (requestAnimationFrame) scheduler.
 *
 * Maintains a flat list of active animations and drives them through a single
 * shared RAF loop. The loop starts automatically when the first animation is
 * added and stops when the last one is removed, avoiding idle CPU cost.
 */
export class AnimationEngine {
  private ids: number[] = [];
  private animations: Record<number, AnimationEngineItem> = {};
  /** Current RAF handle; 0 means the loop is not running. */
  private raf = 0;
  /** Timestamp of the last frame, used to compute delta. */
  private time = 0;
  /** Monotonically increasing counter — guarantees unique IDs across all instances. */
  private static uniqueID = 0;

  constructor() {
    // Bind update to this instance so it retains the correct `this` when passed
    // as a bare callback to requestAnimationFrame.
    this.update = this.update.bind(this);
  }

  /**
   * Main RAF callback. Computes the frame delta, reschedules itself if there
   * are still active animations, then ticks each one in reverse-index order.
   * Reverse iteration is safe against mid-loop removals shifting later indices.
   */
  private update(): void {
    const now = performance.now();
    const delta = now - this.time;
    this.time = now;

    let i = this.ids.length;
    this.raf = i ? requestAnimationFrame(this.update) : 0;

    while (i--) {
      this.animations[this.ids[i]]?.update(delta);
    }
  }

  /**
   * Registers an animation and starts the RAF loop if it is currently idle.
   * @param animation - Object implementing AnimationEngineItem; receives a unique `animationId`.
   */
  add(animation: AnimationEngineItem): void {
    animation.animationId = AnimationEngine.uniqueID++;
    this.ids.push(animation.animationId);
    this.animations[animation.animationId] = animation;

    if (this.raf !== 0) return;
    this.time = performance.now();
    this.raf = requestAnimationFrame(this.update);
  }

  /**
   * Unregisters an animation. The RAF loop stops automatically once all
   * animations have been removed.
   * @param animation - The animation to remove; no-op if not currently registered.
   */
  remove(animation: AnimationEngineItem): void {
    if (animation.animationId === undefined) return;
    const index = this.ids.indexOf(animation.animationId);
    if (index < 0) return;

    this.ids.splice(index, 1);
    delete this.animations[animation.animationId];
  }

  /**
   * Removes all animations and stops the RAF loop. Useful for cleanup when the entire engine is being discarded.
   */
  clear(): void {
    this.ids = [];
    this.animations = {};
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}

// ----------------------------

/**
 * Base class for anything that needs a per-frame tick.
 *
 * Implements AnimationEngineItem so subclasses can be registered directly with
 * AnimationEngine. Subclasses only need to implement `update(delta)`; lifecycle
 * (start/stop) is handled here.
 */
abstract class Animation implements AnimationEngineItem {
  animationId?: number;

  /**
   * @param engine    - The shared AnimationEngine that will drive this animation.
   * @param autoStart - If true, registers with the engine immediately on construction.
   */
  constructor(
    protected engine: AnimationEngine,
    autoStart = false,
  ) {
    if (autoStart) this.start();
  }

  /**
   * Registers this animation with the engine, starting the RAF loop if idle.
   */
  start(): void {
    this.engine.add(this);
  }

  /**
   * Unregisters this animation; the RAF loop stops if no other animations remain.
   */
  stop(): void {
    this.engine.remove(this);
  }

  /**
   * Per-frame logic — must be implemented by each subclass.
   * @param delta - Time elapsed since the last frame in milliseconds.
   */
  abstract update(delta: number): void;
}

/**
 * Owns the Three.js render context: scene, camera, and WebGL renderer.
 *
 * Registered with AnimationEngine on construction (autoStart = true), so its
 * `update()` is called every frame to flush the scene to the canvas.
 * Also manages responsive layout — repositioning the camera on every resize so
 * the virtual stage always fits the container regardless of aspect ratio.
 */
export class World extends Animation {
  scene = new THREE.Scene();
  renderer: THREE.WebGLRenderer;
  camera = new THREE.PerspectiveCamera(2, 1, 0.1, 10000);
  width = 0;
  height = 0;
  fov = 10;
  /** Callbacks invoked after each resize, allowing dependents to react. */
  readonly onResize: (() => void)[] = [];
  /** Callbacks invoked once per frame, before the scene is rendered. */
  readonly onUpdate: (() => void)[] = [];

  /** Virtual stage dimensions (in world units) the camera is fitted to. */
  private readonly stage = { width: 2, height: 3 };
  /** Pre-bound reference kept so the same function can be removed from the listener. */
  private readonly onResizeBound = () => this.resize();

  constructor(
    engine: AnimationEngine,
    private container: HTMLElement,
  ) {
    super(engine, true);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.createLights();
    this.resize();
    window.addEventListener('resize', this.onResizeBound);
  }

  /**
   * Flushes the scene to the canvas each frame.
   * @param delta - Time elapsed since the last frame in milliseconds.
   */
  override update(): void {
    this.onUpdate.forEach((cb) => cb());
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * resize() has two jobs: fit the canvas to the container, and reposition the camera so the virtual stage always fills the view.
   * The camera math works backwards from the desired visible area. Given a fixed FOV and stage size, you derive the distance the camera must be at so the stage exactly fits. The tricky part is the two-branch ternary:
   *      stage aspect (2/3 ≈ 0.67) vs camera aspect (container width/height)
   *
   *      stage aspect < camera aspect  →  tall viewport  →  height is the limiting axis
   *      stage aspect ≥ camera aspect  →  wide viewport  →  width is the limiting axis
   * Each branch inverts the perspective projection formula (visible_height = 2 * distance * tan(fov/2)) to solve for distance. Then *= 0.5 halves it — the camera sits at (d, d, d) which is √3 * d away diagonally, so this compensates for that.
   */
  resize(): void {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    // Sync canvas resolution and camera aspect to the container dimensions.
    this.renderer.setSize(this.width, this.height);
    this.camera.fov = this.fov;
    this.camera.aspect = this.width / this.height;

    const aspect = this.stage.width / this.stage.height; // stage's own aspect ratio (2/3 ≈ 0.67)
    const fovRad = this.fov * THREE.MathUtils.DEG2RAD; // convert FOV to radians for Math.tan

    // Invert the perspective formula (visible = 2 * d * tan(fov/2)) to solve for d.
    // Pick the axis that limits the view: height when viewport is wide, width when narrow.
    let distance =
      aspect < this.camera.aspect
        ? this.stage.height / 2 / Math.tan(fovRad / 2) // height-constrained
        : this.stage.width / this.camera.aspect / (2 * Math.tan(fovRad / 2)); // width-constrained

    // Camera sits at (d, d, d), which is √3·d away diagonally — halving compensates for that.
    distance *= 0.5;

    // Isometric-like diagonal position so all three axes are equally visible.
    this.camera.position.set(distance, distance, distance);
    this.camera.lookAt(this.scene.position);
    this.camera.updateProjectionMatrix();

    this.onResize.forEach((cb) => cb());
  }

  /** Stops the animation, removes the resize listener, and releases GPU resources. */
  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResizeBound);
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }

  /**
   * Adds ambient + two directional lights (front/back) to produce soft,
   * shadow-free shading on the cube faces.
   */
  private createLights(): void {
    // Object3D: invisible scene-graph node used purely as a group container.
    // Grouping the lights lets them be moved/rotated together as one unit.
    const holder = new THREE.Object3D();

    // AmbientLight: omnidirectional, no source position — raises the overall brightness floor.
    const ambient = new THREE.AmbientLight('#FFFFFF', 0.69);

    // DirectionalLight: parallel rays from a point at infinity — simulates a distant source like the sun.
    // front + back pair creates subtle depth shading without requiring shadow maps.
    const front = new THREE.DirectionalLight('#FFFFFF', 0.36); // upper-front-right
    const back = new THREE.DirectionalLight('#FFFFFF', 0.19); // lower-back-left (fill light, dimmer)
    front.position.set(1.5, 5, 3);
    back.position.set(-1.5, -5, -3);

    holder.add(ambient, front, back);
    this.scene.add(holder);
  }
}

// ─── Easing & Tween ──────────────────────────────────────────────────────────

type EasingFn = (t: number) => number;

const Easing = {
  Power: {
    In: (power: number): EasingFn => {
      power = Math.round(power || 1);
      return (t) => Math.pow(t, power);
    },
    Out: (power: number): EasingFn => {
      power = Math.round(power || 1);
      return (t) => 1 - Math.abs(Math.pow(t - 1, power));
    },
    InOut: (power: number): EasingFn => {
      power = Math.round(power || 1);
      return (t) =>
        t < 0.5
          ? Math.pow(t * 2, power) / 2
          : (1 - Math.abs(Math.pow(t * 2 - 1 - 1, power))) / 2 + 0.5;
    },
  },
  Sine: {
    In: (): EasingFn => (t) => 1 + Math.sin((Math.PI / 2) * t - Math.PI / 2),
    Out: (): EasingFn => (t) => Math.sin((Math.PI / 2) * t),
    InOut: (): EasingFn => (t) => (1 + Math.sin(Math.PI * t - Math.PI / 2)) / 2,
  },
  Back: {
    Out: (s: number): EasingFn => {
      s = s || 1.70158;
      return (t) => (t -= 1) * t * ((s + 1) * t + s) + 1;
    },
    In: (s: number): EasingFn => {
      s = s || 1.70158;
      return (t) => t * t * ((s + 1) * t - s);
    },
  },
};

interface TweenOptions {
  duration?: number;
  easing?: EasingFn;
  onUpdate?: (tween: Tween) => void;
  onComplete?: (tween: Tween) => void;
  delay?: number | false;
}

/**
 * A single time-based animation registered with the shared AnimationEngine.
 * Ported from main.js; the only structural change is that the engine is now
 * passed in explicitly instead of pulled from a global singleton.
 *
 * The from/to value-interpolation feature of the original is unused by the
 * button controls, so it has been dropped to keep the port lean.
 */
class Tween extends Animation {
  private duration: number;
  private easing: EasingFn;
  private onUpdate: (tween: Tween) => void;
  private onComplete: (tween: Tween) => void;

  progress = 0;
  value = 0;
  delta = 0;

  constructor(engine: AnimationEngine, options: TweenOptions) {
    super(engine, false);

    this.duration = options.duration || 500;
    this.easing = options.easing || ((t) => t);
    this.onUpdate = options.onUpdate || (() => {});
    this.onComplete = options.onComplete || (() => {});

    const delay = options.delay || false;
    if (delay) setTimeout(() => this.start(), delay);
    else this.start();

    this.onUpdate(this);
  }

  override update(delta: number): void {
    const old = this.value;
    this.progress += delta / this.duration;

    this.value = this.easing(this.progress);
    this.delta = this.value - old;

    if (this.progress <= 1) {
      this.onUpdate(this);
    } else {
      this.progress = 1;
      this.value = 1;
      this.onUpdate(this);
      this.onComplete(this);
      this.stop();
    }
  }
}

// ─── Game Context ────────────────────────────────────────────────────────────

export interface GameContext {
  engine: AnimationEngine;
  world: World;
  cube?: RubikCube;
  controls?: Controls;
  scrambler?: Scrambler;
}

// ─── RubikCube ───────────────────────────────────────────────────────────────

type CubePosition = THREE.Vector3 & { edges: number[] };

interface CubeColors {
  U: number;
  D: number;
  F: number;
  R: number;
  B: number;
  L: number;
  P: number;
  G: number;
}

const DEFAULT_CUBE_COLORS: CubeColors = {
  U: 0xffffff,
  D: 0xffef48,
  F: 0xef3923,
  R: 0x41aac8,
  B: 0xff8c0a,
  L: 0x82ca38,
  P: 0x08101a,
  G: 0xd1d5db,
};

export class RubikCube {
  size = 3;

  readonly holder = new THREE.Object3D();
  readonly object = new THREE.Object3D();
  readonly animator = new THREE.Object3D();

  private readonly geometry = {
    pieceCornerRadius: 0.12,
    edgeCornerRoundness: 0.15,
    edgeScale: 0.82,
    edgeDepth: 0.01,
  };

  private positions: CubePosition[] = [];
  pieces: THREE.Object3D[] = [];
  edges: THREE.Mesh[] = [];
  cubes: THREE.Mesh[] = [];

  private scale = 1;
  private sizeGenerated = 0;
  private activeTweens: Partial<Record<'x' | 'y', Tween>> = {};

  constructor(private context: GameContext) {
    this.holder.add(this.animator);
    this.animator.add(this.object);
    this.context.world.scene.add(this.holder);
  }

  init(): void {
    this.cubes = [];
    this.object.clear();

    // Phase 4: this.object.add(context.controls.group)

    if (this.size === 2) this.scale = 1.25;
    else if (this.size === 3) this.scale = 1;
    else if (this.size > 3) this.scale = 3 / this.size;

    this.object.scale.set(this.scale, this.scale, this.scale);

    // Phase 4: context.controls.edges.scale.set(controlsScale, ...)

    this.generatePositions();
    this.generateModel();

    this.pieces.forEach((piece) => {
      this.cubes.push(piece.userData['cube'] as THREE.Mesh);
      this.object.add(piece);
    });

    this.holder.traverse((node) => {
      node.frustumCulled = false;
    });

    this.updateColors(DEFAULT_CUBE_COLORS);
    this.sizeGenerated = this.size;
  }

  reset(): void {
    // Phase 4: context.controls.edges.rotation.set(0, 0, 0)
    this.holder.rotation.set(0, 0, 0);
    this.object.rotation.set(0, 0, 0);
    this.animator.rotation.set(0, 0, 0);
  }

  /**
   * Animates the cube's orientation anchor (holder) to an absolute target angle
   * on the given axis using the shared Tween/RAF system.
   * Cancels any in-flight animation on the same axis before starting a new one.
   */
  rotateCube(axis: 'x' | 'y', to: number, duration = 400): void {
    this.activeTweens[axis]?.stop();
    const from = this.holder.rotation[axis];
    this.activeTweens[axis] = new Tween(this.context.engine, {
      duration,
      easing: Easing.Sine.Out(),
      onUpdate: (tween) => {
        this.holder.rotation[axis] = from + (to - from) * tween.value;
      },
      onComplete: () => {
        delete this.activeTweens[axis];
      },
    });
  }

  updateColors(colors: CubeColors): void {
    if (!this.pieces.length || !this.edges.length) return;

    this.pieces.forEach((piece) => {
      const mesh = piece.userData['cube'] as THREE.Mesh;
      (mesh.material as THREE.MeshLambertMaterial).color.setHex(colors.P);
    });

    this.edges.forEach((edge) => {
      (edge.material as THREE.MeshLambertMaterial).color.setHex(
        colors[edge.name as keyof CubeColors],
      );
    });
  }

  loadFromData(data: {
    size: number;
    names: string[];
    positions: THREE.Vector3Like[];
    rotations: { x: number; y: number; z: number }[];
  }): void {
    this.size = data.size;
    this.reset();
    this.init();

    this.pieces.forEach((piece) => {
      const index = data.names.indexOf(piece.name);
      const position = data.positions[index];
      const rotation = data.rotations[index];
      piece.position.set(position.x, position.y, position.z);
      piece.rotation.set(rotation.x, rotation.y, rotation.z);
    });
  }

  private generatePositions(): void {
    const m = this.size - 1;
    const first = this.size % 2 !== 0 ? -Math.floor(this.size / 2) : 0.5 - this.size / 2;

    this.positions = [];

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        for (let z = 0; z < this.size; z++) {
          const position = new THREE.Vector3(first + x, first + y, first + z) as CubePosition;
          const edges: number[] = [];

          if (x === 0) edges.push(0);
          if (x === m) edges.push(1);
          if (y === 0) edges.push(2);
          if (y === m) edges.push(3);
          if (z === 0) edges.push(4);
          if (z === m) edges.push(5);

          position.edges = edges;
          this.positions.push(position);
        }
      }
    }
  }

  private generateModel(): void {
    this.pieces = [];
    this.edges = [];

    const pieceSize = 1 / 3;
    const mainMaterial = new THREE.MeshLambertMaterial();

    const pieceMesh = new THREE.Mesh(
      new RoundedBoxGeometry(pieceSize, this.geometry.pieceCornerRadius, 3),
      mainMaterial.clone(),
    );

    const edgeGeometry = RoundedPlaneGeometry(
      pieceSize,
      this.geometry.edgeCornerRoundness,
      this.geometry.edgeDepth,
    );

    const FACE_NAMES = ['L', 'R', 'D', 'U', 'B', 'F'] as const;

    this.positions.forEach((position, index) => {
      const piece = new THREE.Object3D();
      const pieceCube = pieceMesh.clone();

      piece.position.copy(position.clone().divideScalar(3));
      piece.add(pieceCube);
      piece.name = String(index);

      position.edges.forEach((edgeIndex) => {
        const edge = new THREE.Mesh(edgeGeometry, mainMaterial.clone());
        const distance = pieceSize / 2;

        edge.position.set(
          distance * [-1, 1, 0, 0, 0, 0][edgeIndex],
          distance * [0, 0, -1, 1, 0, 0][edgeIndex],
          distance * [0, 0, 0, 0, -1, 1][edgeIndex],
        );
        edge.rotation.set(
          (Math.PI / 2) * [0, 0, 1, -1, 0, 0][edgeIndex],
          (Math.PI / 2) * [-1, 1, 0, 0, 2, 0][edgeIndex],
          0,
        );
        edge.scale.setScalar(this.geometry.edgeScale);
        edge.name = FACE_NAMES[edgeIndex];

        piece.add(edge);
        this.edges.push(edge);
      });

      piece.userData['cube'] = pieceCube;
      piece.userData['edges'] = position.edges.map((i) => FACE_NAMES[i]);
      piece.userData['start'] = {
        position: piece.position.clone(),
        rotation: piece.rotation.clone(),
      };

      this.pieces.push(piece);
    });
  }
}

// ─── Controls ────────────────────────────────────────────────────────────────

/** Internal state machine — mirrors the STILL/ROTATING phases of the original. */
const enum ControlState {
  Still = 0,
  Rotating = 2,
}

/** Standard cube-notation faces. Append `'` for counter-clockwise (prime) moves. */
export type Move = 'L' | "L'" | 'R' | "R'" | 'U' | "U'" | 'D' | "D'" | 'F' | "F'" | 'B' | "B'";

type Axis = 'x' | 'y' | 'z';

interface LayerMove {
  position: THREE.Vector3; // which layer to grab (±1 on one axis)
  axis: Axis; // rotation axis
  angle: number; // ±π/2
}

const HALF_PI = Math.PI / 2;

/**
 * Maps each notation move to a layer descriptor.
 * `position` selects the slice; `axis`/`angle` define the turn.
 * Signs follow the standard convention (clockwise looking at the face);
 * a prime move is the same descriptor with the angle negated.
 */
const MOVES: Record<Move, LayerMove> = {
  R: { position: new THREE.Vector3(1, 0, 0), axis: 'x', angle: -HALF_PI },
  "R'": { position: new THREE.Vector3(1, 0, 0), axis: 'x', angle: HALF_PI },
  L: { position: new THREE.Vector3(-1, 0, 0), axis: 'x', angle: HALF_PI },
  "L'": { position: new THREE.Vector3(-1, 0, 0), axis: 'x', angle: -HALF_PI },
  U: { position: new THREE.Vector3(0, 1, 0), axis: 'y', angle: -HALF_PI },
  "U'": { position: new THREE.Vector3(0, 1, 0), axis: 'y', angle: HALF_PI },
  D: { position: new THREE.Vector3(0, -1, 0), axis: 'y', angle: HALF_PI },
  "D'": { position: new THREE.Vector3(0, -1, 0), axis: 'y', angle: -HALF_PI },
  F: { position: new THREE.Vector3(0, 0, 1), axis: 'z', angle: -HALF_PI },
  "F'": { position: new THREE.Vector3(0, 0, 1), axis: 'z', angle: HALF_PI },
  B: { position: new THREE.Vector3(0, 0, -1), axis: 'z', angle: HALF_PI },
  "B'": { position: new THREE.Vector3(0, 0, -1), axis: 'z', angle: -HALF_PI },
};

/**
 * Button-driven cube controls. A trimmed port of main.js `Controls`:
 * keeps only the layer-rotation machinery (no drag, raycasting, momentum,
 * or cube reorientation). Public entry point is `move(notation)`.
 */
export class Controls {
  /** Temporary parent that the active layer's pieces are reparented into and spun. */
  readonly group = new THREE.Object3D();

  private readonly flipEasings = [Easing.Power.Out(3), Easing.Sine.Out(), Easing.Back.Out(1.5)];
  private readonly flipSpeeds = [125, 200, 300];
  private flipConfig = 2;

  private flipAxis = new THREE.Vector3();
  private flipLayer: string[] | null = null;

  private state = ControlState.Still;
  private enabled = false;

  /** Fired after a (non-scramble) move completes. */
  onMove: () => void = () => {};

  constructor(private context: GameContext) {
    this.group.name = 'controls';
    this.context.cube!.object.add(this.group);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  /**
   * Executes a single notation move (e.g. `'L'`, `"R'"`).
   * No-op while another move is animating or while disabled.
   * @returns true if the move started, false if rejected.
   */
  move(notation: Move, callback: () => void = () => {}): boolean {
    if (this.state !== ControlState.Still || !this.enabled) return false;

    const m = MOVES[notation];
    const layer = this.getLayer(m.position);

    this.flipAxis = new THREE.Vector3();
    this.flipAxis[m.axis] = 1;
    this.state = ControlState.Rotating;

    this.selectLayer(layer);
    this.rotateLayer(m.angle, false, () => {
      this.state = ControlState.Still;
      callback();
    });

    return true;
  }

  /**
   * Applies a sequence of notation moves one after another, remapped to the
   * cube's current visual orientation so moves act on the face the user sees.
   */
  applyAlgorithm(notations: string[]): void {
    const mapping = this.buildFaceRemapping();
    const apply = (remaining: string[]) => {
      if (remaining.length === 0) return;
      const [head, ...tail] = remaining;
      const remapped = (mapping[head[0]] + head.slice(1)) as Move;
      this.move(remapped, () => apply(tail));
    };
    apply(notations);
  }

  private buildFaceRemapping(): Record<string, string> {
    const canonical: [string, THREE.Vector3][] = [
      ['R', new THREE.Vector3(1, 0, 0)],
      ['L', new THREE.Vector3(-1, 0, 0)],
      ['U', new THREE.Vector3(0, 1, 0)],
      ['D', new THREE.Vector3(0, -1, 0)],
      ['F', new THREE.Vector3(0, 0, 1)],
      ['B', new THREE.Vector3(0, 0, -1)],
    ];
    const qInv = this.context.cube!.holder.quaternion.clone().invert();
    const mapping: Record<string, string> = {};
    for (const [face, worldDir] of canonical) {
      const localDir = worldDir.clone().applyQuaternion(qInv);
      let best = face;
      let bestDot = -Infinity;
      for (const [candidate, normal] of canonical) {
        const dot = localDir.dot(normal);
        if (dot > bestDot) {
          bestDot = dot;
          best = candidate;
        }
      }
      mapping[face] = best;
    }
    return mapping;
  }

  scrambleCube(scrambler: Scrambler): void {
    const converted = scrambler.converted;
    const move = converted[0];
    const layer = this.getLayer(move.position);

    this.flipAxis = new THREE.Vector3();
    this.flipAxis[move.axis] = 1;

    this.selectLayer(layer);
    this.rotateLayer(move.angle, true, () => {
      converted.shift();
      if (converted.length > 0) {
        this.scrambleCube(scrambler);
      }
    });
  }

  private rotateLayer(rotation: number, isScramble: boolean, callback: () => void): void {
    const config = isScramble ? 0 : this.flipConfig;
    const easing = this.flipEasings[config];
    const duration = this.flipSpeeds[config];
    const cube = this.context.cube!;

    new Tween(this.context.engine, {
      easing,
      duration,
      onUpdate: (tween) => {
        this.group.rotateOnAxis(this.flipAxis, tween.delta * rotation);
      },
      onComplete: () => {
        if (!isScramble) this.onMove();

        const layer = this.flipLayer!.slice(0);

        cube.object.rotation.setFromVector3(
          this.snapRotation(eulerToVector3(cube.object.rotation)),
        );
        this.group.rotation.setFromVector3(this.snapRotation(eulerToVector3(this.group.rotation)));
        this.deselectLayer(this.flipLayer!);

        callback();
        void layer;
      },
    });
  }

  /** Returns the piece names that lie on the same slice as `position`. */
  private getLayer(position: THREE.Vector3): string[] {
    const cube = this.context.cube!;
    const scalar = ({ 2: 6, 3: 3, 4: 4, 5: 3 } as Record<number, number>)[cube.size];
    const axis = this.getMainAxis(position);
    const layer: string[] = [];

    cube.pieces.forEach((piece) => {
      const piecePosition = piece.position.clone().multiplyScalar(scalar).round();
      if (piecePosition[axis] === position[axis]) layer.push(piece.name);
    });

    return layer;
  }

  private selectLayer(layer: string[]): void {
    this.group.rotation.set(0, 0, 0);
    this.movePieces(layer, this.context.cube!.object, this.group);
    this.flipLayer = layer;
  }

  private deselectLayer(layer: string[]): void {
    this.movePieces(layer, this.group, this.context.cube!.object);
    this.flipLayer = null;
  }

  /** Reparents pieces between containers while preserving world transform. */
  private movePieces(layer: string[], from: THREE.Object3D, to: THREE.Object3D): void {
    const cube = this.context.cube!;
    from.updateMatrixWorld();
    to.updateMatrixWorld();

    layer.forEach((name) => {
      const piece = cube.pieces.find((p) => p.name === name);
      if (!piece) return;

      piece.applyMatrix4(from.matrixWorld);
      from.remove(piece);
      piece.applyMatrix4(new THREE.Matrix4().copy(to.matrixWorld).invert());
      to.add(piece);
    });
  }

  private getMainAxis(vector: THREE.Vector3): Axis {
    return (['x', 'y', 'z'] as Axis[]).reduce((a, b) =>
      Math.abs(vector[a]) > Math.abs(vector[b]) ? a : b,
    );
  }

  private roundAngle(angle: number): number {
    const round = HALF_PI;
    return Math.sign(angle) * Math.round(Math.abs(angle) / round) * round;
  }

  private snapRotation(vector: THREE.Vector3): THREE.Vector3 {
    return vector.set(
      this.roundAngle(vector.x),
      this.roundAngle(vector.y),
      this.roundAngle(vector.z),
    );
  }
}

/** Replacement for the removed Euler.toVector3(). */
function eulerToVector3(euler: THREE.Euler): THREE.Vector3 {
  return new THREE.Vector3(euler.x, euler.y, euler.z);
}

// ─── Scrambler ───────────────────────────────────────────────────────────────

interface ScrambledLayerMove extends LayerMove {
  name: string;
}

export class Scrambler {
  difficulty = 0;

  private readonly scrambleLength: Record<number, number[]> = {
    2: [7, 9, 11],
    3: [20, 25, 30],
    4: [30, 40, 50],
    5: [40, 60, 80],
  };

  moves: string[] = [];
  converted: ScrambledLayerMove[] = [];
  print = '';

  constructor(private context: GameContext) {}

  scramble(scramble?: string): this {
    let count = 0;
    this.moves = typeof scramble !== 'undefined' ? scramble.split(' ') : [];

    if (this.moves.length < 1) {
      const scrambleLength = this.scrambleLength[this.context.cube!.size][this.difficulty];
      const faces = this.context.cube!.size < 4 ? 'UDLRFB' : 'UuDdLlRrFfBb';
      const modifiers = ['', "'", '2'];
      const total = typeof scramble === 'undefined' ? scrambleLength : scramble;

      while (count < (total as number)) {
        const move =
          faces[Math.floor(Math.random() * faces.length)] +
          modifiers[Math.floor(Math.random() * 3)];

        if (count > 0 && move.charAt(0) === this.moves[count - 1].charAt(0)) continue;
        if (count > 1 && move.charAt(0) === this.moves[count - 2].charAt(0)) continue;

        this.moves.push(move);
        count++;
      }
    }

    this.convert();
    this.print = this.moves.join(' ');

    return this;
  }

  convert(): void {
    this.converted = [];

    this.moves.forEach((move) => {
      const convertedMove = this.convertMove(move);
      const modifier = move.charAt(1);

      this.converted.push(convertedMove);
      if (modifier === '2') this.converted.push({ ...convertedMove });
    });
  }

  private convertMove(move: string): ScrambledLayerMove {
    const face = move.charAt(0);
    const modifier = move.charAt(1);

    const axisMap: Record<string, Axis> = { D: 'y', U: 'y', L: 'x', R: 'x', F: 'z', B: 'z' };
    const rowMap: Record<string, number> = { D: -1, U: 1, L: -1, R: 1, F: 1, B: -1 };

    const axis = axisMap[face.toUpperCase()];
    let row = rowMap[face.toUpperCase()];

    if (this.context.cube!.size > 3 && face !== face.toUpperCase()) row = row * 2;

    const position = new THREE.Vector3();
    position[axis] = row;

    const angle = (Math.PI / 2) * -row * (modifier === "'" ? -1 : 1);

    return { position, axis, angle, name: move };
  }
}
