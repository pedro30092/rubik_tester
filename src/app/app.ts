import {
  AfterViewInit,
  Component,
  NO_ERRORS_SCHEMA,
  OnDestroy,
  ViewEncapsulation,
} from '@angular/core';
import { initializeRubikGame } from './code';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None,
  schemas: [NO_ERRORS_SCHEMA],
})
export class App implements AfterViewInit, OnDestroy {
  ngAfterViewInit(): void {
    initializeRubikGame();
  }

  ngOnDestroy(): void {
    // Keep a stable entry point for future cleanup if the game gets a destroy API.
  }
}
