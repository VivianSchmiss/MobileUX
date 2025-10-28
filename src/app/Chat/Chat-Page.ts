import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ChatService, Message } from '../services/chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="chat-detail" *ngIf="!loading; else loadingTpl">
      <div *ngFor="let msg of messages" class="message" [class.mine]="msg.sender === currentUser">
        <div class="message-header">
          <span class="sender">{{ msg.sender }}</span>
          <span class="time">{{ msg.createdAt }}</span>
        </div>
        <div class="content">{{ msg.content }}</div>
      </div>

      <!-- Eingabe für neue Nachricht -->
      <div class="message-input">
        <input
          type="text"
          [value]="newMessage"
          (input)="newMessage = $any($event.target).value"
          placeholder="Nachricht schreiben..."
          (keyup.enter)="sendMessage()"
        />
        <button (click)="sendMessage()">Senden</button>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div>Loading messages...</div>
    </ng-template>
  `,
  styleUrls: ['./Chat.css'],
})
export class Chat implements OnInit {
  messages: Message[] = [];
  chatId!: string;
  loading = true;
  newMessage = '';
  currentUser = sessionStorage.getItem('userid') || 'Ich';

  constructor(private route: ActivatedRoute, private chatService: ChatService) {}

  ngOnInit() {
    this.chatId = this.route.snapshot.paramMap.get('id')!;
    this.loadMessages();
  }

  loadMessages() {
    this.loading = true;
    this.chatService.getMessages(this.chatId).subscribe({
      next: (msgs) => {
        console.log('Loaded messages', this.chatId, msgs);
        this.messages = msgs;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading messages', err);
        this.loading = false;
      },
    });
  }

  sendMessage() {
    const content = this.newMessage.trim();
    if (!content) return;

    const tempId = Math.random().toString();
    const tempMessage: Message = {
      id: tempId,
      chatId: this.chatId,
      sender: this.currentUser,
      content,
      createdAt: new Date().toISOString(),
    };

    this.messages.push(tempMessage);
    this.newMessage = '';

    this.chatService.sendMessage(this.chatId, content).subscribe({
      next: (msg) => {
        const index = this.messages.findIndex((m) => m.id === tempId);
        if (index >= 0) this.messages[index] = msg;

        this.loadMessages();
      },
      error: (err) => {
        console.error('Error sending message', err);
      },
    });
  }
}
