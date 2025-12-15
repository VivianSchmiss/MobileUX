import { Routes } from '@angular/router';
import { Register } from './Register/Register-Page';
import { Login } from './Login/Login-Page';
import { ChatFeed } from './Chat-Feed/ChatFeed-Page';
import { Chat } from './Chat/Chat-Page';
import { CreateChat } from './Chat/Create-Chat';
import { Invites } from './Chat/Invites';
import { AuthGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login },
  { path: 'register', component: Register },

  // nur mit Token erreichbar
  {
    path: 'chat-feed',
    component: ChatFeed,
    canActivate: [AuthGuard],
  },
  {
    path: 'chat/:id',
    component: Chat,
    canActivate: [AuthGuard],
  },
  {
    path: 'create-chat',
    component: CreateChat,
    canActivate: [AuthGuard],
  },
  {
    path: 'invites',
    component: Invites,
    canActivate: [AuthGuard],
  },

  { path: '**', redirectTo: 'login' },
];

/*export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'chat-feed', component: ChatFeed },
  { path: 'chat/:id', component: Chat },
  { path: 'create-chat', component: CreateChat },
  { path: 'invites', component: Invites },
  { path: '**', redirectTo: 'login' },
];*/

/*export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./Login/Login-Page').then(m => m.Login),
  },
  {
    path: 'chat-feed',
    loadComponent: () =>
      import('./ChatFeed/ChatFeed-Page').then(m => m.ChatFeed),
    canActivate: [AuthGuard],
    canMatch: [AuthGuard],
  },
  {
    path: 'chat/:id',
    loadComponent: () =>
      import('./Chat/Chat-Page').then(m => m.ChatPage),
    canActivate: [AuthGuard],
    canMatch: [AuthGuard],
  },
  {
    path: 'invites',
    loadComponent: () =>
      import('./Invites/Invites-Page').then(m => m.InvitesPage),
    canActivate: [AuthGuard],
    canMatch: [AuthGuard],
  },
  {
    path: 'create-chat',
    loadComponent: () =>
      import('./Chat/CreateChat-Page').then(m => m.CreateChatPage),
    canActivate: [AuthGuard],
    canMatch: [AuthGuard],
  },

  // Default: schon eingeloggt? → Redirect auf chat-feed
  { path: '', pathMatch: 'full', redirectTo: 'chat-feed' },
  { path: '**', redirectTo: 'chat-feed' },
];*/
