import { Component, input, output, signal } from '@angular/core';
import { StepConfig, CategoryConfig, AlgorithmConfig } from '../algorithms.config';
import { CubeColors } from '../../../cube-engine/cube-engine';
import { StepSelector } from './step-selector/step-selector';
import { CategorySelector } from './category-selector/category-selector';
import { AlgorithmGrid } from './algorithm-grid/algorithm-grid';
import { SettingsSection, SpeedPreset, ColorChange } from './settings-section/settings-section';

export type PanelTab = 'algorithms' | 'settings';

@Component({
  selector: 'app-learning-panel',
  imports: [StepSelector, CategorySelector, AlgorithmGrid, SettingsSection],
  templateUrl: './learning-panel.html',
  styleUrl: './learning-panel.scss',
})
export class LearningPanel {
  steps = input.required<StepConfig[]>();
  selectedStep = input<StepConfig | null>(null);
  selectedCategory = input<CategoryConfig | null>(null);
  selectedAlgorithm = input<AlgorithmConfig | null>(null);
  currentSpeed = input<SpeedPreset>(2);
  currentColors = input<CubeColors | undefined>(undefined);
  baseRotation = input<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  stepSelected = output<StepConfig>();
  categorySelected = output<CategoryConfig>();
  algorithmPracticed = output<AlgorithmConfig>();
  speedChanged = output<SpeedPreset>();
  colorChanged = output<ColorChange>();

  activeTab = signal<PanelTab>('algorithms');

  setTab(tab: PanelTab): void {
    this.activeTab.set(tab);
  }
}
