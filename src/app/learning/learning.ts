import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, signal } from '@angular/core';
import {
  AnimationEngine,
  World,
  RubikCube,
  Controls,
  GameContext,
  CubeColors,
  DEFAULT_CUBE_COLORS,
} from '../../cube-engine/cube-engine';
import { LEARNING_STEPS, StepConfig, CategoryConfig, AlgorithmConfig } from './algorithms.config';
import { invertAlgorithm } from './algorithm-utils';
import { LearningPanel } from './learning-panel/learning-panel';
import { SpeedPreset, ColorChange } from './learning-panel/settings-section/settings-section';

@Component({
  selector: 'app-learning',
  imports: [LearningPanel],
  templateUrl: './learning.html',
  styleUrl: './learning.scss',
})
export class Learning implements AfterViewInit, OnDestroy {
  @ViewChild('cubeContainer') cubeContainerRef!: ElementRef<HTMLDivElement>;

  private world!: World;
  private rubikCube!: RubikCube;
  private controls!: Controls;

  readonly steps = LEARNING_STEPS;

  selectedStep = signal<StepConfig | null>(null);
  selectedCategory = signal<CategoryConfig | null>(null);
  selectedAlgorithm = signal<AlgorithmConfig | null>(null);
  toastMessage = signal<string | null>(null);
  currentSpeed = signal<SpeedPreset>(2);
  currentColors = signal<CubeColors>({ ...DEFAULT_CUBE_COLORS });

  // Stored synchronously when a step is selected — used as the hook before
  // every algorithm setup so buildFaceRemapping() reads the correct quaternion.
  baseRotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    const container = this.cubeContainerRef.nativeElement;
    const engine = new AnimationEngine();
    this.world = new World(engine, container);

    const context: GameContext = { engine, world: this.world };
    this.rubikCube = new RubikCube(context);
    context.cube = this.rubikCube;

    this.controls = new Controls(context);
    context.controls = this.controls;

    this.rubikCube.init();
    this.rubikCube.object.add(this.controls.group);
    this.controls.enable();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.world?.dispose();
  }

  onStepSelected(step: StepConfig): void {
    this.selectedStep.set(step);
    this.selectedCategory.set(null);
    this.selectedAlgorithm.set(null);

    // Compute and save base rotation from the step's orientation config.
    this.baseRotation = { x: 0, y: 0, z: 0 };
    for (const rot of step.orientation ?? []) {
      this.baseRotation[rot.axis] = rot.angle;
    }

    this.resetCube();
    // Animate to step orientation for visual feedback.
    for (const rot of step.orientation ?? []) {
      this.rubikCube.rotateCube(rot.axis, rot.angle);
    }
  }

  onCategorySelected(category: CategoryConfig): void {
    this.selectedCategory.set(category);
    this.selectedAlgorithm.set(null);
  }

  onAlgorithmPracticed(algo: AlgorithmConfig): void {
    this.selectedAlgorithm.set(algo);
    this.setupAlgorithm(algo);
  }

  onResetToBase(): void {
    const step = this.selectedStep();
    if (!step) return;
    this.selectedAlgorithm.set(null);
    this.resetCube();
    for (const rot of step.orientation ?? []) {
      this.rubikCube.rotateCube(rot.axis, rot.angle);
    }
  }

  onSpeedChanged(speed: SpeedPreset): void {
    this.currentSpeed.set(speed);
    this.controls?.setSpeed(speed);
  }

  onColorChanged(change: ColorChange): void {
    const updated = { ...this.currentColors(), [change.face]: change.value };
    this.currentColors.set(updated);
    this.rubikCube?.updateColors(updated);
  }

  // Rebuilds pieces to solved state. Does NOT touch holder rotation.
  private resetCube(): void {
    this.rubikCube.init();
    this.rubikCube.object.add(this.controls.group);
    this.rubikCube.updateColors(this.currentColors());
    this.controls.enable();
  }

  // Applies the stored base rotation synchronously directly to holder so
  // buildFaceRemapping() reads the correct quaternion before applyAlgorithm.
  private applyBaseRotation(): void {
    const { x, y, z } = this.baseRotation;
    this.rubikCube.holder.rotation.set(x, y, z);
  }

  private setupAlgorithm(algo: AlgorithmConfig): void {
    this.resetCube();
    this.applyBaseRotation(); // ← hook: base orientation before notation runs

    const setupMoves = invertAlgorithm(algo.notation);
    if (setupMoves.length === 0) {
      this.showToast(`${algo.label} — ready to practice!`);
      return;
    }

    const originalOnMove = this.controls.onMove;
    let movesLeft = setupMoves.length;
    this.controls.onMove = () => {
      movesLeft--;
      if (movesLeft === 0) {
        this.controls.onMove = originalOnMove;
        this.showToast(`${algo.label} — ready to practice!`);
      }
    };

    this.controls.applyAlgorithm(setupMoves);
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 2800);
  }
}
