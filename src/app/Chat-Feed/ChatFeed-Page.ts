import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChatService, Chat } from '../services/chat.service';
import { Router, RouterLink } from '@angular/router';
import { LogoutButton } from '../Logout/Logout-Button';
import { DeregisterButton } from '../Deregister/Deregister-Button';

@Component({
  selector: 'app-chat-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, LogoutButton, DeregisterButton],
  template: `
    <div class="chat-feed">
      <header class="chat-header">
        <h2>Chat Feed</h2>
        <div class="menu-wrapper">
          <button routerLink="/create-chat">+ Neuer Chat</button>
          <button class="menu-button" (click)="menuOpen = !menuOpen">⋮</button>
          <div class="menu-dropdown" *ngIf="menuOpen">
            <!-- Hier die beiden Komponenten -->
            <app-logout-button></app-logout-button>
            <app-deregister-button></app-deregister-button>
          </div>
        </div>
      </header>

      <div *ngIf="loading">Loading chats...</div>

      <div *ngFor="let chat of chats" class="chat-item" (click)="openChat(chat.id)">
        <div class="chat-name">{{ chat.name }}</div>
        <div class="chat-preview">{{ chat.lastMessage }}</div>
        <div class="chat-time">{{ chat.updatedAt | date : 'short' }}</div>
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
      next: (data) => {
        console.log('Loaded chats:', data);
        this.chats = [
          {
            id: '0',
            name: 'Chat 0',
            lastMessage: 'Willkommen im Standardchat!',
            updatedAt: new Date().toISOString(),
          },
          ...data,
        ];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading chats', err);
        // Zeige Chat 0 auch, wenn API fehlschlägt
        this.chats = [
          {
            id: '0',
            name: 'Chat 0',
            lastMessage: 'Test',
            updatedAt: new Date().toISOString(),
          },
        ];
        this.loading = false;
      },
    });
  }

  openChat(chatId: string) {
    this.router.navigate(['/chat', chatId]);
  }
}
