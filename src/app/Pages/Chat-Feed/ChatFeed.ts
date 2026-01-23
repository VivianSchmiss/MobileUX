import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HeaderService } from '../../services/header.service';
import { ChatService, Chat, Message } from '../../services/chat.service';
import { CacheService } from '../../services/cache.service';

type ChatFeedItem = Chat & {
  lastActivityTs: number;
};

@Component({
  selector: 'app-chat-feed',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ChatFeed.html',
  styleUrls: ['./ChatFeed.css'],
})
export class ChatFeed implements OnInit {
  chats: ChatFeedItem[] = [];

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

    const cached = await this.cache.getChats();
    if (cached.length) {
      this.chats = await this.enrichAndSortChats(cached);
      this.loading = false;
    }

    this.chatService.getChats().subscribe({
      next: async (chats) => {
        this.loading = false;
        const base = chats ?? [];
        await this.cache.setChats(base);
        this.chats = await this.enrichAndSortChats(base);
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private async enrichAndSortChats(baseChats: Chat[]): Promise<any[]> {
    const enriched = await Promise.all(
      baseChats.map(async (c) => {
        await this.ensureLastMessageInCache(c.id);
        const last = await this.cache.getLastMessage(c.id);

        const realTs = this.toTimestamp(last?.createdAt ?? null);
        const sortKey = realTs ?? this.messageFallbackTs(last);
        const timeLabel = realTs ? this.formatLabel(realTs) : '';

        const sender = (last?.senderNick || last?.sender || '').trim() || null;
        const text = last?.content?.trim() ? last.content.trim() : last?.imageUrl ? 'Foto' : null;

        return {
          ...c,
          lastActivityAt: last?.createdAt ?? null,
          lastActivityTs: sortKey,
          lastTimeLabel: timeLabel || null,
          lastSender: sender,
          lastText: text,
        };
      }),
    );

    enriched.sort((a, b) => (b.lastActivityTs ?? 0) - (a.lastActivityTs ?? 0));
    return enriched;
  }

  private async ensureLastMessageInCache(chatId: string): Promise<void> {
    const cached = await this.cache.getMessages(chatId);
    if (cached && cached.length) return;

    await new Promise<void>((resolve) => {
      this.chatService.getMessages(chatId, 0).subscribe({
        next: async (msgs) => {
          if (msgs?.length) {
            await this.cache.setMessages(chatId, msgs);
          }
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  private formatDateTime(value?: string | null): string {
    if (!value) return '';

    const s = String(value).trim();
    if (!s) return '';

    let d = new Date(s);
    if (Number.isFinite(d.getTime())) return this.formatDE(d);

    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) {
      d = new Date(s.replace(' ', 'T'));
      if (Number.isFinite(d.getTime())) return this.formatDE(d);
    }

    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n)) {
        d = new Date(s.length === 10 ? n * 1000 : n);
        if (Number.isFinite(d.getTime())) return this.formatDE(d);
      }
    }

    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]) - 1;
      let year = Number(m[3]);
      if (year < 100) year += 2000;

      const hour = m[4] ? Number(m[4]) : 0;
      const min = m[5] ? Number(m[5]) : 0;
      const sec = m[6] ? Number(m[6]) : 0;

      d = new Date(year, month, day, hour, min, sec);
      if (Number.isFinite(d.getTime())) return this.formatDE(d);
    }

    return '';
  }

  private formatDE(d: Date): string {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }

  private toTimestamp(createdAt?: string | null): number | null {
    const s = (createdAt ?? '').toString().trim();
    if (!s) return null;

    let t = Date.parse(s);
    if (Number.isFinite(t)) return t;

    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) {
      t = Date.parse(s.replace(' ', 'T'));
      if (Number.isFinite(t)) return t;
    }

    if (/^\d+$/.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n) && n > 0) return s.length === 10 ? n * 1000 : n;
    }

    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (m) {
    }

    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})[_ ](\d{2})-(\d{2})-(\d{2})$/);
    if (m2) {
      const [, y, mo, d, h, mi, sec] = m2;
      const dt = new Date(+y, +mo - 1, +d, +h, +mi, +sec);
      if (Number.isFinite(dt.getTime())) return dt.getTime();
    }

    return null;
  }

  private messageFallbackTs(msg: import('../../services/chat.service').Message | null): number {
    if (!msg) return 0;

    const idNum = Number(msg.id);
    return Number.isFinite(idNum) ? idNum : 0;
  }

  private formatLabel(ts: number | null): string {
    if (!ts) return '';

    const d = new Date(ts);
    if (!Number.isFinite(d.getTime())) return '';

    const now = new Date();

    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    if (sameDay) {
      return new Intl.DateTimeFormat('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    }

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.floor(
      (startOfToday - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000,
    );

    if (diffDays >= 1 && diffDays <= 6) {
      return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(d);
    }

    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  goToCreateChat() {
    this.router.navigate(['/create-chat']);
  }

  openChat(chat: Chat) {
    this.router.navigate(['/chat', chat.id], { queryParams: { name: chat.name } });
  }
}
