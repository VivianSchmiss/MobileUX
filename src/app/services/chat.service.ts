import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';

export interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  sender: string;
  content: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private baseUrl = 'https://www2.hs-esslingen.de/~nitzsche/api/';

  constructor(private http: HttpClient, private auth: AuthService) {}

  getChats(): Observable<Chat[]> {
    const token = this.auth.token ?? '';

    const url = `${this.baseUrl}?request=getchats&token=${encodeURIComponent(
      token
    )}&_=${Date.now()}`;

    console.log(token);

    return this.http.get<any>(url).pipe(
      map((res) => {
        if (Array.isArray(res)) return res as Chat[];
        if (res.chats) return res.chats as Chat[];
        if (res.result) return res.result as Chat[];
        console.warn('Unexpected getchats response shape:', res);
        return [];
      })
    );
  }

  getMessages(chatId: string): Observable<Message[]> {
    const token = this.auth.token ?? '';

    const url =
      `https://www2.hs-esslingen.de/~nitzsche/api/` +
      `?request=getmessages` +
      `&token=${encodeURIComponent(token)}` +
      `&fromid=${encodeURIComponent(chatId)}` +
      `&_=${Date.now()}`;

    return this.http.get<any>(url).pipe(
      map((res) => {
        const rawList = Array.isArray(res)
          ? res
          : res.messages
          ? res.messages
          : res.result
          ? res.result
          : [];

        return rawList.map(
          (item: any): Message => ({
            id: String(item.id),
            chatId: String(item.chatid ?? chatId),
            sender: item.usernick || item.userid || 'unknown',
            content: item.text ?? '',
            createdAt: item.time ?? '',
          })
        );
      })
    );
  }

  sendMessage(chatId: string, content: string): Observable<Message> {
    const token = this.auth.token ?? '';

    const url = `https://www2.hs-esslingen.de/~nitzsche/api/`;

    const body = { request: 'postmessage', token: token, text: content, chatid: chatId };

    return this.http.post<any>(url, body).pipe(
      map((res: any) => {
        return {
          id: String(res['message-id'] ?? res.id ?? Math.random()),
          chatId: String(chatId),
          sender: sessionStorage.getItem('userid') ?? 'Ich',
          content,
          createdAt: new Date().toISOString(),
        } as Message;
      })
    );
  }
}
