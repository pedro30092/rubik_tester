import { Component, input, output } from '@angular/core';
import { AlgorithmConfig } from '../../algorithms.config';
import { AlgorithmCard } from './algorithm-card/algorithm-card';

@Component({
  selector: 'app-algorithm-grid',
  imports: [AlgorithmCard],
  templateUrl: './algorithm-grid.html',
  styleUrl: './algorithm-grid.scss',
})
export class AlgorithmGrid {
  algorithms = input.required<AlgorithmConfig[]>();
  selectedAlgorithm = input<AlgorithmConfig | null>(null);
  baseRotation = input<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  algorithmPracticed = output<AlgorithmConfig>();
}
