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
    this.router.navigate(['/scramble']);
  }

  solve(): void {
    this.kb.solveWithPoof();
    this.isOpen.set(false);
  }
}
