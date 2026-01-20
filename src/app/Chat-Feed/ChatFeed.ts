import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChatService, Chat, Message } from '../services/chat.service';
import { CacheService } from '../services/cache.service';
import { Router, RouterLink } from '@angular/router';
import { HeaderService } from '../services/header.service';

@Component({
  selector: 'app-chat-feed',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ChatFeed.html',
  styleUrls: ['./ChatFeed.css'],
})
export class ChatFeed implements OnInit {
  chats: Chat[] = [];
  loading = true;
  menuOpen = false;

  constructor(
    private chatService: ChatService,
    private router: Router,
    private cache: CacheService,
    private headerService: HeaderService,
  ) {}

  async ngOnInit() {
    this.headerService.setShowMenu(false);

    // zuerst aus cache (auch offline)
    const cached = await this.cache.getChats();
    if (cached.length) {
      this.chats = cached;
      this.loading = false;
    }

    // refresh wenn online
    this.chatService.getChats().subscribe({
      next: async (chats) => {
        this.loading = false;
        this.chats = chats ?? [];
        await this.cache.setChats(this.chats);
      },
      error: () => {
        // wenn offline/fehler: cached bleibt
        this.loading = false;
      },
    });
  }

  goToCreateChat() {
    this.router.navigate(['/create-chat']);
  }

  openChat(chat: Chat) {
    this.router.navigate(['/chat', chat.id], { queryParams: { name: chat.name } });
  }
}
