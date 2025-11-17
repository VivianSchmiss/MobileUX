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
  content?: string | null;
  imageUrl?: string | null;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private baseUrl = 'https://www2.hs-esslingen.de/~nitzsche/api/';

  constructor(private http: HttpClient, private auth: AuthService) {}

  getChats(): Observable<Chat[]> {
    const token = this.auth.token ?? ''; // wenn null/undefined dann ''

    const url = `${this.baseUrl}?request=getchats&token=${encodeURIComponent(
      token
    )}&_=${Date.now()}`; // no caching

    console.log(token);

    // http request
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
            imageUrl: item.imageUrl ?? item.imageurl ?? item.image ?? null,
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

    // http post request
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

  sendImage(chatId: string, file: File): Observable<Message> {
    const token = this.auth.token ?? '';
    const url = this.baseUrl;

    const formData = new FormData();
    formData.append('request', 'postimage'); // <-- NAME MUSST DU MIT BACKEND ABSPRECHEN
    formData.append('token', token);
    formData.append('chatid', chatId);
    formData.append('file', file);

    return this.http.post<any>(url, formData).pipe(
      map((res: any) => {
        return {
          id: String(res['message-id'] ?? res.id ?? Math.random()),
          chatId: String(chatId),
          sender: sessionStorage.getItem('userid') ?? 'Ich',
          content: res.text ?? '', // falls Backend optional Text mitschickt
          imageUrl: res.imageUrl ?? res.imageurl ?? res.image ?? null,
          createdAt: res.time ?? new Date().toISOString(),
        } as Message;
      })
    );
  }

  createChat(chatName: string) {
    const token = this.auth.token ?? '';

    const url =
      `https://www2.hs-esslingen.de/~nitzsche/api/` +
      `?request=createchat` +
      `&token=${encodeURIComponent(token)}` +
      `&fromid=${encodeURIComponent(chatName)}` +
      `&_=${Date.now()}`;

    return this.http.get<any>(url).pipe(
      map((res) => {
        const rawList = Array.isArray(res)
          ? res
          : res.chats
          ? res.chats
          : res.result
          ? res.result
          : [];

        // jedes item von array in Chat-Objekt umwandeln
        return rawList.map(
          (item: any): Chat => ({
            id: String(item.id ?? item.chatid ?? ''),
            name: item.name ?? item.chatname ?? 'Unbennant',
            lastMessage: item.lastMessage ?? item.lastmsg ?? item.text ?? '', // 1. was nicht null/undefined nehmen
            updatedAt: item.updatedAt ?? item.time ?? item.timestamp ?? '',
          })
        );
      })
    );
  }

  leaveChat(chatId: string) {
    const token = this.auth.token ?? '';

    const url =
      `https://www2.hs-esslingen.de/~nitzsche/api/` +
      `?request=leavechat` +
      `&token=${encodeURIComponent(token)}` +
      `&fromid=${encodeURIComponent(chatId)}` +
      `&_=${Date.now()}`;

    return this.http.get<any>(url).pipe(
      map((res) => {
        const rawList = Array.isArray(res)
          ? res
          : res.chats
          ? res.chats
          : res.result
          ? res.result
          : [];

        return rawList.map(
          (item: any): Chat => ({
            id: String(item.id ?? item.chatid ?? ''),
            name: item.name ?? item.chatname ?? 'Unbennant',
            lastMessage: item.lastMessage ?? item.lastmsg ?? item.text ?? '',
            updatedAt: item.updatedAt ?? item.time ?? item.timestamp ?? '',
          })
        );
      })
    );
  }

  inviteUserToChat(chatId: string, invitedHash: string) {
    const token = this.auth.token ?? '';

    const url =
      `https://www2.hs-esslingen.de/~nitzsche/api/` +
      `?request=invite` +
      `&token=${encodeURIComponent(token)}` +
      `&fromid=${encodeURIComponent(chatId)}` +
      `&invitedhash=${encodeURIComponent(invitedHash)}` +
      `&_=${Date.now()}`;

    return this.http.get<any>(url).pipe(
      map((res) => {
        return res;
      })
    );
  }

  getInvites() {
    const token = this.auth.token ?? '';

    const url =
      `https://www2.hs-esslingen.de/~nitzsche/api/` +
      `?request=getinvites` +
      `&token=${encodeURIComponent(token)}` +
      `&_=${Date.now()}`;

    return this.http.get<any>(url).pipe(map((res) => res));
  }
}
