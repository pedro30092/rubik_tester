import { Routes } from '@angular/router';
import { Scramble } from './scramble/scramble';
import { Learning } from './learning/learning';

export const routes: Routes = [
  { path: 'scramble', component: Scramble },
  { path: 'learning', component: Learning },
  { path: '**', redirectTo: '' },
];
