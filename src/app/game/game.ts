import {
  AfterViewInit,
  Component,
  NO_ERRORS_SCHEMA,
  OnDestroy,
  ViewEncapsulation,
  inject,
  isDevMode,
} from '@angular/core';
import { initializeRubikGame } from '../code';
import { KeyboardHandlerService } from '../keyboard-handler.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.html',
  encapsulation: ViewEncapsulation.None,
  schemas: [NO_ERRORS_SCHEMA],
})
export class Game implements AfterViewInit, OnDestroy {
  protected readonly kb = inject(KeyboardHandlerService);

  ngAfterViewInit(): void {
    initializeRubikGame();
    this.kb.initialize();
    if (isDevMode()) {
      this.kb.startSolved();
    }
  }

  ngOnDestroy(): void {}
}
