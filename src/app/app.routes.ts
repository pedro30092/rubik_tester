import { Routes } from '@angular/router';
import { Scramble } from './scramble/scramble';
import { Learning } from './learning/learning';
import { DevPlayground } from './dev-playground/dev-playground';

export const routes: Routes = [
  { path: 'scramble', component: Scramble },
  { path: 'learning', component: Learning },
  { path: 'dev-playground', component: DevPlayground },
  { path: '**', redirectTo: '' },
];
