import { Component, input, output } from '@angular/core';
import { StepConfig } from '../../algorithms.config';

@Component({
  selector: 'app-step-selector',
  imports: [],
  templateUrl: './step-selector.html',
  styleUrl: './step-selector.scss',
})
export class StepSelector {
  steps = input.required<StepConfig[]>();
  selected = input<StepConfig | null>(null);

  stepSelected = output<StepConfig>();

  select(step: StepConfig): void {
    this.stepSelected.emit(step);
  }
}
