import { Routes } from '@angular/router';
import { Register } from './Register/Register-Page';
import { Login } from './Login/Login-Page';
import { ChatFeed } from './Chat-Feed/ChatFeed-Page';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'chat-feed', component: ChatFeed },
  { path: '**', redirectTo: 'login' },
];
