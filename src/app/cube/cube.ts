import { Component, ViewChild, AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { AnimationEngine, RubikCube, World, Controls, GameContext, type Move } from './cube-engine';

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

    this.rubikCube.init();
    this.rubikCube.object.add(this.controls.group);
    this.controls.enable();
  }

  /** Public entry point for UI buttons — e.g. <button (click)="move('L')"> */
  move(notation: Move): void {
    console.log(`Moving ${notation}...`);
    this.controls.move(notation);
  }

  ngOnDestroy(): void {
    console.log('Cleaning up animation engine...');
    this.world.dispose();
    this.engine.clear();
  }
}
