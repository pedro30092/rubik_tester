import { Component } from '@angular/core';

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
}
