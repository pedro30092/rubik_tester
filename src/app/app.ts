import { Component, ViewEncapsulation, isDevMode } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Menu } from './menu/menu';
import { Game } from './game/game';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Menu, Game],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
})
export class App {
  protected readonly isDevMode = isDevMode();
}
