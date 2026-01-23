import { Routes } from '@angular/router';
import { Register } from './Pages/Register/Register';
import { Chat } from './Pages/Chat/Chat';
import { Invites } from './Pages/Invites/Invites';
import { AuthGuard } from './services/auth.guard';
import { Profile } from './Pages/Profile/Profile';
import { CreateChat } from './Pages/Create-Chat/CreateChat';
import { Login } from './Pages/Login/Login';
import { ChatFeed } from './Pages/Chat-Feed/ChatFeed';

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
    data: { title: 'Chat', showBack: true, showFooter: true, footerMode: 'chat' },
  },

  {
    path: 'create-chat',
    component: CreateChat,
    canActivate: [AuthGuard],
    data: { title: 'Neuer Chat', showFooter: false, showBack: true, contentScroll: 'none' },
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
