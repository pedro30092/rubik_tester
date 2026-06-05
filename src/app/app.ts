import {
  AfterViewInit,
  Component,
  NO_ERRORS_SCHEMA,
  OnDestroy,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { initializeRubikGame } from './code';
import { KeyboardHandlerService } from './keyboard-handler.service';
import { Menu } from './menu/menu';

@Component({
  selector: 'app-root',
  imports: [Menu],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None,
  schemas: [NO_ERRORS_SCHEMA],
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly kb = inject(KeyboardHandlerService);

  ngAfterViewInit(): void {
    initializeRubikGame();
    this.kb.initialize();
  }

  ngOnDestroy(): void {}
}
