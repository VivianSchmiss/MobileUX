import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap, catchError } from 'rxjs';
import { AuthService } from './auth.service';

export interface Chat {
  id: string;
  name: string;
  role?: string;
}

export interface Message {
  id: string;
  chatId: string;
  sender: string;
  content?: string | null;
  imageUrl?: string | null;
  createdAt: string;
}

export interface CreateChat {
  id: string;
  name: string;
  participantIds: string[];
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

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly baseUrl = 'https://www2.hs-esslingen.de/~nitzsche/api/';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getToken(): string {
    return this.auth.token ?? '';
  }

  private getApi<T>(
    request: string,
    extraParams: Record<string, string | number | undefined> = {}
  ): Observable<T> {
    let params = new HttpParams()
      .set('request', request)
      .set('token', this.getToken())
      .set('_', Date.now().toString());

    for (const [key, value] of Object.entries(extraParams)) {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }

    return this.http.get<T>(this.baseUrl, { params });
  }

  private postApi<T>(request: string, extraBody: Record<string, unknown> = {}): Observable<T> {
    const body = {
      request,
      token: this.getToken(),
      ...extraBody,
    };

    return this.http.post<T>(this.baseUrl, body);
  }

  private extractList<T>(res: any, keys: string[]): T[] {
    if (Array.isArray(res)) return res as T[];

    for (const key of keys) {
      if (Array.isArray(res?.[key])) {
        return res[key] as T[];
      }
    }

    console.warn('Unexpected response shape:', res);
    return [];
  }

  getChats(): Observable<Chat[]> {
    return this.getApi<any>('getchats').pipe(
      map((res) => {
        const rawList = this.extractList<any>(res, ['chats', 'result']) ?? [];

        console.log('getchats rawList:', rawList);

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
          })
        );
      })
    );
  }

  getMessages(chatId: string, fromId: number = 0): Observable<Message[]> {
    return this.getApi<any>('getmessages', { fromid: fromId, chatid: chatId }).pipe(
      map((res) => {
        const rawList = this.extractList<any>(res, ['messages', 'result']);

        return rawList.map((item: any): Message => {
          const photoId = item.photoid ?? item.photoId ?? item.photo ?? item.image ?? null;

          let imageUrl: string | null = null;

          if (photoId) {
            const token = this.getToken();
            imageUrl =
              `${this.baseUrl}` +
              `?request=getphoto` +
              `&token=${encodeURIComponent(token)}` +
              `&photoid=${encodeURIComponent(photoId)}`;
          }

          return {
            id: String(item.id),
            chatId: String(item.chatid ?? chatId),
            sender: item.usernick || item.userid || 'unknown',
            content: item.text ?? '',
            imageUrl,
            createdAt: item.time ?? '',
          };
        });
      })
    );
  }

  sendMessage(chatId: string, content: string): Observable<Message> {
    return this.postApi<any>('postmessage', {
      text: content,
      chatid: chatId,
    }).pipe(
      map(
        (res: any): Message => ({
          id: String(res['message-id'] ?? res.id ?? Math.random()),
          chatId: String(chatId),
          sender: sessionStorage.getItem('userid') ?? 'Ich',
          content,
          createdAt: new Date().toISOString(),
        })
      )
    );
  }

  sendImage(chatId: string, file: File, content?: string): Observable<Message> {
    const fileToBase64$ = new Observable<string>((observer) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] ?? '';
        observer.next(base64);
        observer.complete();
      };

      reader.onerror = () => {
        observer.error(reader.error || new Error('Datei konnte nicht gelesen werden.'));
      };

      reader.readAsDataURL(file);
    });

    return fileToBase64$.pipe(
      switchMap((base64) => {
        const body: any = {
          chatid: chatId,
          photo: base64,
          position: 0,
        };

        if (content && content.trim()) {
          body.text = content.trim();
        }

        return this.postApi<any>('postmessage', body);
      }),
      map((res: any): Message => {
        const messageId = String(res['message-id'] ?? res.id ?? Math.random());

        const photoId = res.photoid ?? res.photoId ?? res.photo ?? null;

        let imageUrl: string | null = null;

        if (photoId) {
          const token = this.getToken();
          imageUrl =
            `${this.baseUrl}` +
            `?request=getphoto` +
            `&token=${encodeURIComponent(token)}` +
            `&photoid=${encodeURIComponent(photoId)}`;
        }

        return {
          id: messageId,
          chatId: String(chatId),
          sender: sessionStorage.getItem('userid') ?? 'Ich',
          content: content ?? null,
          imageUrl,
          createdAt: new Date().toISOString(),
        };
      })
    );
  }

  getProfiles(): Observable<Profile[]> {
    return this.getApi<any>('getprofiles').pipe(
      map((res) => {
        const rawList = this.extractList<any>(res, ['profiles', 'result']);
        return rawList.map(
          (item: any): Profile => ({
            hash: item.hash ?? item.userid ?? '',
            nickname: item.nickname ?? item.usernick ?? 'Unbenannter Nutzer',
          })
        );
      })
    );
  }

  createChat(chatname: string): Observable<Chat> {
    return this.getApi<any>('createchat', { chatname }).pipe(
      map((res) => {
        if (res && (res.chatid != null || res.id != null)) {
          const candidate = res;
          return {
            id: String(candidate.chatid ?? candidate.id),
            name: chatname,
            lastMessage: null,
            updatedAt: null,
          } as Chat;
        }

        const list = this.extractList<any>(res, ['chats', 'chatlist', 'result']);
        const item = list[list.length - 1] ?? {};

        return {
          id: String(item.chatid ?? item.id),
          name: item.chatname ?? item.name ?? chatname,
          lastMessage: item.lastmessage ?? null,
          updatedAt: item.updated_at ?? null,
        } as Chat;
      })
    );
  }

  deleteChat(chatid: string): Observable<Chat> {
    return this.getApi<any>('deletechat', { chatid }).pipe(
      map((res) => {
        const candidate = res.chat ?? res.result ?? res;

        return {
          id: String(candidate.id ?? chatid),
          name: candidate.name ?? candidate.chatname ?? 'Gelöschter Chat',
        } as Chat;
      })
    );
  }

  invite(chatid: string, invitedhash: string): Observable<Invite[]> {
    return this.getApi<any>('invite', { chatid, invitedhash }).pipe(
      map((res) => {
        const rawList = this.extractList<any>(res, ['invites', 'result', 'chats', 'chatlist']);

        return rawList.map(
          (item: any): Invite => ({
            id: String(item.chatid ?? chatid),
            name: item.chatname ?? item.name ?? undefined,
            sender: item.fromuser ?? item.userid ?? undefined,
          })
        );
      })
    );
  }

  getInvites(): Observable<Invite[]> {
    return this.getApi<any>('getinvites').pipe(
      map((res) => {
        const rawList = this.extractList<any>(res, ['invites', 'result']);
        return rawList.map(
          (item: any): Invite => ({
            id: String(item.chatid),
            name: item.chatname ?? undefined,
            sender: item.fromuser ?? item.userid ?? undefined,
          })
        );
      })
    );
  }

  joinChat(chatid: string): Observable<void> {
    return this.getApi<any>('joinchat', { chatid }).pipe(
      map(() => {
        return;
      })
    );
  }

  leaveChat(chatid: string): Observable<void> {
    return this.getApi<any>('leavechat', { chatid }).pipe(
      map(() => {
        return;
      })
    );
  }
}
