import { Routes } from '@angular/router';
import { Register } from './Register/Register';
import { Login } from './Login/Login';
import { ChatFeed } from './Chat-Feed/ChatFeed';
import { Chat } from './Chat/ChatPage';
import { CreateChat } from './Chat/CreateChat';
import { Invites } from './Chat/Invites';
import { AuthGuard } from './services/auth.guard';
import { Profile } from './Profile/Profile';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: Login, data: { title: 'Login' } },
  { path: 'register', component: Register, data: { title: 'Registrieren' } },

  {
    path: 'chat-feed',
    component: ChatFeed,
    canActivate: [AuthGuard],
    data: { title: 'Chats' },
  },
  {
    path: 'chat/:id',
    component: Chat,
    canActivate: [AuthGuard],
    data: { title: 'Chat' },
  },
  {
    path: 'create-chat',
    component: CreateChat,
    canActivate: [AuthGuard],
    data: { title: 'Neuer Chat' },
  },
  {
    path: 'invites',
    component: Invites,
    canActivate: [AuthGuard],
    data: { title: 'Einladungen' },
  },
  {
    path: 'profile',
    component: Profile,
    canActivate: [AuthGuard],
    data: { title: 'Profil' },
  },

  { path: '**', redirectTo: 'login' },
];
