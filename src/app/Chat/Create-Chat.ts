import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../services/chat.service';

@Component({
  selector: 'app-create-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="create-chat-container">
      <h2>Neuen Chat erstellen</h2>

      <input [(ngModel)]="chatName" placeholder="Chatname eingeben" class="chat-input" />

      <button (click)="createChat()" [disabled]="loading">
        {{ loading ? 'Erstelle...' : 'Erstellen' }}
      </button>

      <p class="back-link">
        <a routerLink="/chat-feed">← Zurück zum Chat Feed</a>
      </p>
    </div>
  `,
  styleUrls: ['./Create-Chat.css'],
})
export class CreateChatPage {
  chatName = '';
  loading = false;

  constructor(private chatService: ChatService, private router: Router) {}

  createChat() {
    if (!this.chatName.trim()) {
      alert('Bitte gib einen Chatnamen ein.');
      return;
    }

    this.loading = true;

    this.chatService.createChat(this.chatName.trim()).subscribe({
      next: () => {
        this.loading = false;
        alert('Chat erfolgreich erstellt!');
        this.router.navigate(['/chat-feed']);
      },
      error: (err) => {
        console.error('createChat failed', err);
        alert('Fehler beim Erstellen des Chats');
        this.loading = false;
      },
    });
  }
}
