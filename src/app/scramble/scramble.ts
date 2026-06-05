import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { KeyboardHandlerService } from '../keyboard-handler.service';

/**
 * Command-pattern route: fires scramble and immediately redirects back to /.
 * The GameComponent stays permanently mounted in the shell, so the engine
 * never loses its DOM references.
 */
@Component({ selector: 'app-scramble', template: '' })
export class Scramble implements OnInit {
  private readonly kb = inject(KeyboardHandlerService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.kb.scrambleWithPoof();
    this.router.navigate(['/'], { replaceUrl: true });
  }
}
