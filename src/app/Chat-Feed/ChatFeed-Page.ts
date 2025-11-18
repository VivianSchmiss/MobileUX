import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChatService, Chat, Message } from '../services/chat.service';
import { Router, RouterLink } from '@angular/router';
import { LogoutButton } from '../Logout/Logout-Button';
import { DeregisterButton } from '../Deregister/Deregister-Button';
import { ActivatedRoute } from '@angular/router';
import { Invites } from '../Chat/Invites';

@Component({
  selector: 'app-chat-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, Invites, LogoutButton, DeregisterButton],
  template: `
    <div class="chat-feed">
      <header class="chat-header">
        <h2>Chat Feed</h2>
        <div class="menu-wrapper">
          <button routerLink="/create-chat">+ Neuer Chat</button>
          <button class="menu-button" (click)="menuOpen = !menuOpen">⋮</button>
          <div class="menu-dropdown" *ngIf="menuOpen">
            <button [routerLink]="['/invites']">Einladungen</button>
            <app-logout-button></app-logout-button>
            <app-deregister-button></app-deregister-button>
          </div>
        </div>
      </header>

      <div *ngIf="loading">Loading chats...</div>

      <div *ngFor="let chat of chats" class="chat-item" (click)="openChat(chat)">
        <div class="chat-name">{{ chat.name }}</div>
      </div>
    </div>
  `,
  styleUrls: ['./ChatFeed.css'],
})
export class ChatFeed implements OnInit {
  chats: Chat[] = [];
  loading = true;
  menuOpen = false;

  constructor(private chatService: ChatService, private router: Router) {}

  ngOnInit() {
    this.chatService.getChats().subscribe({
      next: (chats) => {
        this.loading = false;
        this.chats = chats ?? [];
        console.log('Chats in Feed:', this.chats);
      },
      error: () => {
        this.loading = false;
        this.chats = [];
      },
    });
  }

  openChat(chat: Chat) {
    this.router.navigate(['/chat', chat.id], { queryParams: { name: chat.name } });
  }
}
