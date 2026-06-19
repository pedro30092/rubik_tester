import { Routes } from '@angular/router';
import { Learning } from './learning/learning';
import { Cube } from './cube/cube';

export const routes: Routes = [
  { path: 'learning', component: Learning },
  { path: 'cube', component: Cube },
  { path: '**', redirectTo: '' },
];
