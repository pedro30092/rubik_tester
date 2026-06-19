import { Component, ViewChild, AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
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

  ngAfterViewInit(): void {
    // Dynamically import the animation engine to avoid loading it before the view is initialized.
    console.log('Loading animation engine...');
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

  /** Public entry point for UI buttons — e.g. <button (click)="move('L')"> */
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

  ngOnDestroy(): void {
    this.world.dispose();
    this.engine.clear();
  }
}
