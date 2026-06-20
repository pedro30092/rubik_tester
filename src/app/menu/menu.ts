import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  imports: [],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu {
  protected readonly isOpen = signal(false);
  private readonly router = inject(Router);

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  scramble(): void {
    this.isOpen.set(false);
    // If still on the intro screen, startGame() already scrambles — no poof needed.
  }

  solve(): void {
    this.isOpen.set(false);
  }

  learning(): void {
    this.isOpen.set(false);
    this.router.navigate(['/learning']);
  }
}
