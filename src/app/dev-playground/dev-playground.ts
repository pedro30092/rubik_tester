import { Component } from '@angular/core';
import { CanvasBox } from '../canvas-box/canvas-box';

@Component({
  selector: 'app-dev-playground',
  imports: [CanvasBox],
  templateUrl: './dev-playground.html',
  styleUrl: './dev-playground.scss',
})
export class DevPlayground {}
