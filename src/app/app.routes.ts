import { Routes } from '@angular/router';
import { Register } from './register/register.page';
import { Login } from './login/login.page';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: '**', redirectTo: 'login' },
];
