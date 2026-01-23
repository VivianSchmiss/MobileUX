import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export interface Chat {
  id: string;
  name: string;
  role?: string;
  lastActivityAt?: string | null;
  lastActivityTs?: number;
  lastSender?: string | null;
  lastText?: string | null;
  lastTimeLabel?: string | null;
}

export interface Message {
  id: string;
  chatId: string;
  sender: string;
  senderNick?: string;
  content?: string | null;
  imageUrl?: string | null;
  createdAt: string;
}

export interface Profile {
  hash: string;
  nickname: string;
}

export interface Invite {
  id: string;
  name: string;
  sender: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly baseUrl = '/nitzsche-api';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {}

  private requireToken(): string {
    const token = (this.auth.token ?? '').trim();
    return token;
  }

  // für GET: request + token + params
  private getApi<T>(
    request: string,
    extraParams: Record<string, string | number | undefined> = {},
  ): Observable<T> {
    const token = this.requireToken().trim();

    let params = new HttpParams()
      .set('request', request)
      .set('token', token)
      .set('_', Date.now().toString());

    for (const [key, value] of Object.entries(extraParams)) {
      if (value !== undefined && value !== null) params = params.set(key, String(value));
    }

    return this.http.get<T>(this.baseUrl, { params });
  }

  // für POST: postmessage
  private postApi<T>(request: string, body: Record<string, unknown>): Observable<T> {
    const token = this.requireToken().trim();
    return this.http.post<T>(this.baseUrl, {
      request,
      token,
      ...body,
    });
  }

  private extractList<T>(res: any, keys: string[]): T[] {
    if (Array.isArray(res)) return res as T[];
    for (const k of keys) {
      if (Array.isArray(res?.[k])) return res[k] as T[];
    }
    return [];
  }

  getChats(): Observable<Chat[]> {
    return this.getApi<any>('getchats').pipe(
      map((res) => {
        const rawList = this.extractList<any>(res, ['chats', 'result']) ?? [];

        const filtered = rawList.filter((item: any) => {
          const role = String(item.role ?? '')
            .trim()
            .toLowerCase();
          return role === 'member' || role === 'owner';
        });

        return filtered.map(
          (item: any): Chat => ({
            id: String(item.chatid ?? item.id),
            name: item.chatname ?? item.name ?? 'Unbenannter Chat',
            role: String(item.role ?? '').trim(),
          }),
        );
      }),
    );
  }

  getMessages(chatId: string, fromId: number = 0): Observable<Message[]> {
    return this.getApi<any>('getmessages', { fromid: fromId, chatid: chatId }).pipe(
      map((res) => {
        const raw = this.extractList<any>(res, ['messages', 'result']);

        return raw.map((item: any): Message => {
          const photoId = item.photoid ?? item.photoId ?? item.photo ?? null;
          let imageUrl: string | null = null;

          if (photoId) {
            const token = this.requireToken();
            imageUrl =
              `${this.baseUrl}` +
              `?request=getphoto` +
              `&token=${encodeURIComponent(token)}` +
              `&photoid=${encodeURIComponent(String(photoId))}`;
          }

          return {
            id: String(item.id),
            chatId: String(item.chatid ?? chatId),
            sender: item.userid || item.usernick || 'unknown',
            senderNick: item.usernick || item.userid || 'unknown',
            content: item.text ?? '',
            imageUrl,
            createdAt: String(item.time ?? ''),
          };
        });
      }),
    );
  }

  // POST
  sendMessage(chatId: string, content: string): Observable<any> {
    return this.postApi<any>('postmessage', { chatid: chatId, text: content });
  }

  sendImage(chatId: string, file: File, content?: string): Observable<any> {
    const fileToBase64$ = new Observable<string>((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] ?? '';
        observer.next(base64);
        observer.complete();
      };
      reader.onerror = () =>
        observer.error(reader.error || new Error('Datei konnte nicht gelesen werden.'));
      reader.readAsDataURL(file);
    });

    return fileToBase64$.pipe(
      switchMap((base64) =>
        this.postApi<any>('postmessage', {
          chatid: chatId,
          photo: base64,
          ...(content && content.trim() ? { text: content.trim() } : {}),
        }),
      ),
    );
  }

  getProfiles(): Observable<Profile[]> {
    return this.getApi<any>('getprofiles').pipe(
      map((res) => {
        const raw = this.extractList<any>(res, ['profiles', 'result']);
        return raw.map(
          (item: any): Profile => ({
            hash: item.hash ?? item.userid ?? '',
            nickname: item.nickname ?? item.usernick ?? 'Unbenannter Nutzer',
          }),
        );
      }),
    );
  }

  createChat(chatname: string): Observable<Chat> {
    return this.getApi<any>('createchat', { chatname }).pipe(
      map((res) => {
        // API: response "chat-list" → letzten Eintrag oder direct id nehmen
        if (res && (res.chatid != null || res.id != null)) {
          return { id: String(res.chatid ?? res.id), name: chatname } as Chat;
        }
        const list = this.extractList<any>(res, ['chats', 'chatlist', 'result']);
        const item = list[list.length - 1] ?? {};
        return {
          id: String(item.chatid ?? item.id ?? ''),
          name: item.chatname ?? item.name ?? chatname,
          role: String(item.role ?? '').trim(),
        } as Chat;
      }),
    );
  }

  deleteChat(chatid: string): Observable<void> {
    return this.getApi<any>('deletechat', { chatid }).pipe(map(() => void 0));
  }

  invite(chatid: string, invitedhash: string): Observable<any> {
    return this.getApi<any>('invite', { chatid, invitedhash });
  }

  getInvites(): Observable<Invite[]> {
    return this.getApi<any>('getinvites').pipe(
      map((res) => {
        const raw = this.extractList<any>(res, ['invites', 'result']);
        return raw.map(
          (item: any): Invite => ({
            id: String(item.chatid),
            name: item.chatname ?? undefined,
            sender: item.fromuser ?? item.userid ?? undefined,
          }),
        );
      }),
    );
  }

  joinChat(chatid: string): Observable<void> {
    return this.getApi<any>('joinchat', { chatid }).pipe(map(() => void 0));
  }

  leaveChat(chatid: string): Observable<void> {
    return this.getApi<any>('leavechat', { chatid }).pipe(map(() => void 0));
  }
}
