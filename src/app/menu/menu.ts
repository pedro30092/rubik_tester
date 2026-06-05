import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
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
  private readonly router = inject(Router);

  toggle(): void {
    this.isOpen.update(v => !v);
  }

  scramble(): void {
    this.isOpen.set(false);
    // If still on the intro screen, startGame() already scrambles — no poof needed.
    if (!this.kb.ensureStarted()) {
      this.router.navigate(['/scramble']);
    }
  }

  solve(): void {
    this.isOpen.set(false);
    // If still on the intro screen, just start the game (a fresh scramble is enough).
    if (!this.kb.ensureStarted()) {
      this.kb.solveWithPoof();
    }
  }

  learning(): void {
    this.isOpen.set(false);
    this.kb.ensureStarted();
    this.router.navigate(['/learning']);
  }
}
