import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { type GameContext } from './cube-engine';

/**
 * Wraps Three.js OrbitControls to orbit the camera around the cube.
 * Pan and zoom are disabled — rotate only.
 * Damping is enabled for a weighted, inertial feel.
 *
 * Plugs into the engine via GameContext:
 *   - world.onUpdate → controls.update() each frame (required for damping)
 *   - world.onResize → re-syncs internal state after camera is repositioned
 */
export class CubeOrbitControls {
  private readonly controls: OrbitControls;

  constructor(private readonly context: GameContext) {
    const { world } = context;

    this.controls = new OrbitControls(world.camera, world.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    world.onUpdate.push(this.onUpdate);
    world.onResize.push(this.onResize);
  }

  private onUpdate = (): void => {
    this.controls.update();
  };

  private onResize = (): void => {
    // World.resize() resets camera.position — re-sync OrbitControls' internal
    // spherical state so the next drag starts from the correct orientation.
    this.controls.update();
  };

  dispose(): void {
    const { onUpdate, onResize } = this.context.world;
    onUpdate.splice(onUpdate.indexOf(this.onUpdate), 1);
    onResize.splice(onResize.indexOf(this.onResize), 1);
    this.controls.dispose();
  }
}
