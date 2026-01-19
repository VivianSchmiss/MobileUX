import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Chat, Message } from './chat.service';

interface AppDB extends DBSchema {
  chats: {
    key: string; // immer "all"
    value: Chat[];
  };
  messages: {
    key: string; // chatId
    value: Message[];
  };
  meta: {
    key: string; // z.B. "lastFromId:<chatId>"
    value: number;
  };
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private dbPromise: Promise<IDBPDatabase<AppDB>>;

  constructor() {
    this.dbPromise = openDB<AppDB>('messenger-db', 1, {
      upgrade(db) {
        db.createObjectStore('chats');
        db.createObjectStore('messages');
        db.createObjectStore('meta');
      },
    });
  }

  async getChats(): Promise<Chat[]> {
    const db = await this.dbPromise;
    return (await db.get('chats', 'all')) ?? [];
  }

  async setChats(chats: Chat[]): Promise<void> {
    const db = await this.dbPromise;
    await db.put('chats', chats, 'all');
  }

  async getMessages(chatId: string): Promise<Message[]> {
    const db = await this.dbPromise;
    return (await db.get('messages', chatId)) ?? [];
  }

  async setMessages(chatId: string, messages: Message[]): Promise<void> {
    const db = await this.dbPromise;
    await db.put('messages', messages, chatId);

    // lastFromId: polling kann ab da holen
    const maxId = this.getMaxNumericId(messages);
    await db.put('meta', maxId, `lastFromId:${chatId}`);
  }

  async getLastFromId(chatId: string): Promise<number> {
    const db = await this.dbPromise;
    return (await db.get('meta', `lastFromId:${chatId}`)) ?? 0;
  }

  async appendMessages(chatId: string, newMessages: Message[]): Promise<void> {
    if (!newMessages?.length) return;

    const old = await this.getMessages(chatId);
    const merged = this.mergeById(old, newMessages);
    await this.setMessages(chatId, merged);
  }

  private mergeById(oldList: Message[], newList: Message[]): Message[] {
    const map = new Map<string, Message>();
    for (const m of oldList) map.set(m.id, m);
    for (const m of newList) map.set(m.id, m);

    const merged = Array.from(map.values());
    merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return merged;
  }

  private getMaxNumericId(list: Message[]): number {
    let max = 0;
    for (const m of list) {
      const n = Number(m.id);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return max;
  }
}
