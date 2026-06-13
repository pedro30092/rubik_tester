import { Component } from '@angular/core';
import { applyAlgorithm } from '../code';

@Component({
  selector: 'app-learning',
  imports: [],
  templateUrl: './learning.html',
  styleUrl: './learning.css',
})
export class Learning {
  onTest(): void {
    console.log('Test');
  }

  onTestAlgorithm(): void {
    console.log('Test Algorithm');
    applyAlgorithm("R' R");
  }
}
