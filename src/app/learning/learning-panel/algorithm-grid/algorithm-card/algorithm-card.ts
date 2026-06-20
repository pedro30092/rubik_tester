import {
  Component,
  input,
  output,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import {
  AnimationEngine,
  World,
  RubikCube,
  Controls,
  GameContext,
} from '../../../../../cube-engine/cube-engine';
import { AlgorithmConfig } from '../../../algorithms.config';
import { invertAlgorithm } from '../../../algorithm-utils';

@Component({
  selector: 'app-algorithm-card',
  imports: [],
  templateUrl: './algorithm-card.html',
  styleUrl: './algorithm-card.scss',
})
export class AlgorithmCard implements AfterViewInit, OnDestroy {
  config = input.required<AlgorithmConfig>();
  active = input(false);
  baseRotation = input<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  practiced = output<AlgorithmConfig>();

  @ViewChild('preview') previewRef!: ElementRef<HTMLDivElement>;

  private world!: World;

  ngAfterViewInit(): void {
    const container = this.previewRef.nativeElement;
    const engine = new AnimationEngine();
    this.world = new World(engine, container);

    const context: GameContext = { engine, world: this.world };
    const rubikCube = new RubikCube(context);
    context.cube = rubikCube;

    const controls = new Controls(context);
    context.controls = controls;

    rubikCube.init();
    rubikCube.object.add(controls.group);
    controls.enable();

    // Apply step base orientation synchronously before applyAlgorithm so
    // buildFaceRemapping() reads the correct quaternion.
    const { x, y, z } = this.baseRotation();
    rubikCube.holder.rotation.set(x, y, z);

    const setup = invertAlgorithm(this.config().notation);
    if (setup.length > 0) {
      controls.applyAlgorithm(setup);
    }
  }

  ngOnDestroy(): void {
    this.world?.dispose();
  }

  onPractice(): void {
    this.practiced.emit(this.config());
  }
}
