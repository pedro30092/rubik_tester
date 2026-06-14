import { Routes } from '@angular/router';
import { Scramble } from './scramble/scramble';
import { Learning } from './learning/learning';
import { DevPlayground } from './dev-playground/dev-playground';
import { Cube } from './cube/cube';

export const routes: Routes = [
  { path: 'scramble', component: Scramble },
  { path: 'learning', component: Learning },
  { path: 'dev-playground', component: DevPlayground },
  { path: 'cube', component: Cube },
  { path: '**', redirectTo: '' },
];
