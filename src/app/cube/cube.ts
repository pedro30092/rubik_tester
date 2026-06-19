import { Component, ViewChild, AfterViewInit, ElementRef, OnDestroy, signal } from '@angular/core';
import {
  AnimationEngine,
  RubikCube,
  World,
  Controls,
  Scrambler,
  GameContext,
  type Move,
} from '../../cube-engine/cube-engine';

@Component({
  selector: 'app-cube',
  imports: [],
  templateUrl: './cube.html',
  styleUrl: './cube.scss',
})
export class Cube implements AfterViewInit, OnDestroy {
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  private engine!: AnimationEngine;
  private world!: World;
  private context!: GameContext;
  private rubikCube!: RubikCube;
  private controls!: Controls;
  private scrambler!: Scrambler;

  readonly whiteUp = signal(true);

  ngAfterViewInit(): void {
    this.engine = new AnimationEngine();
    this.world = new World(this.engine, this.containerRef.nativeElement);

    this.context = { engine: this.engine, world: this.world };
    this.rubikCube = new RubikCube(this.context);
    this.context.cube = this.rubikCube;

    this.controls = new Controls(this.context);
    this.context.controls = this.controls;

    this.scrambler = new Scrambler(this.context);
    this.context.scrambler = this.scrambler;

    this.rubikCube.init();
    this.rubikCube.object.add(this.controls.group);
    this.controls.enable();
  }

  move(notation: Move): void {
    this.controls.move(notation);
  }

  scramble(): void {
    this.scrambler.scramble();
    this.controls.scrambleCube(this.scrambler);
  }

  reset(): void {
    this.rubikCube.init();
    this.rubikCube.object.add(this.controls.group);
  }

  flipOrientation(): void {
    const next = !this.whiteUp();
    this.whiteUp.set(next);
    this.rubikCube.rotateCube('x', next ? 0 : Math.PI);
  }

  // ── Orbit pad ──────────────────────────────────────────────────────────────

  spinLeft(): void {
    this.rubikCube.rotateCube('y', this.rubikCube.holder.rotation.y + Math.PI / 2);
  }

  spinRight(): void {
    this.rubikCube.rotateCube('y', this.rubikCube.holder.rotation.y - Math.PI / 2);
  }

  tiltUp(): void {
    this.rubikCube.rotateCube('x', this.rubikCube.holder.rotation.x - Math.PI / 2);
  }

  tiltDown(): void {
    this.rubikCube.rotateCube('x', this.rubikCube.holder.rotation.x + Math.PI / 2);
  }

  ngOnDestroy(): void {
    this.world.dispose();
    this.engine.clear();
  }
}
