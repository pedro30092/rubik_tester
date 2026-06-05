import { Routes } from '@angular/router';
import { Scramble } from './scramble/scramble';

export const routes: Routes = [
  { path: 'scramble', component: Scramble },
  { path: '**', redirectTo: '' },
];
