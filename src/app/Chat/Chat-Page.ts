import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ChatService, Message, Profile } from '../services/chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './Chat.html',
  styleUrls: ['./Chat.css'],
})
export class Chat implements OnInit {
  messages: Message[] = [];
  chatId!: string;
  chatName = '';
  loading = true;
  newMessage = '';
  currentUser = sessionStorage.getItem('userid') || 'Ich';

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private router: Router
  ) {}

  ngOnInit() {
    this.chatId = this.route.snapshot.paramMap.get('id') ?? '';

    this.chatService.getChats().subscribe({
      next: (chats) => {
        const found = chats.find((c) => c.id === this.chatId);
        this.chatName = found?.name ?? '';
      },
    });

    this.loadMessages();
  }

  loadMessages() {
    this.loading = true;
    this.chatService.getMessages(this.chatId, 0).subscribe({
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

    // Nachricht bevor Server-Antwort da
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

    // post-request zur api
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

  leaveChat() {
    if (!this.chatId) {
      return;
    }

    this.loading = true;

    this.chatService.leaveChat(this.chatId).subscribe({
      next: () => {
        this.router.navigate(['/chat-feed']);
      },
      error: (err) => {
        console.error('Error leaving chat', err);
        this.loading = false;
      },
    });
  }
}
