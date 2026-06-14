import { Component, ViewChild, AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { AnimationEngine, RubikCube, World, type GameContext } from './cube-engine';

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
  private rubikCube!: RubikCube;

  ngAfterViewInit(): void {
    // Dynamically import the animation engine to avoid loading it before the view is initialized.
    console.log('Loading animation engine...');
    this.engine = new AnimationEngine();
    this.world = new World(this.engine, this.containerRef.nativeElement);

    const context: GameContext = { world: this.world };
    this.rubikCube = new RubikCube(context);
    this.rubikCube.init();
  }

  ngOnDestroy(): void {
    console.log('Cleaning up animation engine...');
    this.world.dispose();
    this.engine.clear();
  }
}
