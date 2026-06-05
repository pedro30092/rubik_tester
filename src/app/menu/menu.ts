import { Component, signal, inject } from '@angular/core';
import { KeyboardHandlerService } from '../keyboard-handler.service';

@Component({
  selector: 'app-menu',
  imports: [],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  protected readonly kb = inject(KeyboardHandlerService);
  protected readonly isOpen = signal(false);

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  scramble(): void {
    this.kb.scrambleWithPoof();
    this.isOpen.set(false);
  }

  solve(): void {
    this.kb.solveWithPoof();
    this.isOpen.set(false);
  }
}
