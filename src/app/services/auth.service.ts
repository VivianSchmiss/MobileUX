import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

// was von server kommt
export type LoginResponse =
  | {
      status: 'ok';
      token: string;
      hash?: string;
      userhash?: string;
      message?: string;
      code?: number;
    }
  | { status: 'error'; message?: string; info?: string; code?: number };

export type RegisterResponse =
  | { status: 'ok'; token?: string; info?: string; hash?: string; userhash?: string }
  | { status: 'error'; info?: string; message?: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = '/nitzsche-api';

  constructor(private http: HttpClient) {}

  // session-only
  get token(): string | null {
    return sessionStorage.getItem('authToken');
  }

  setToken(token: string) {
    sessionStorage.setItem('authToken', token);
  }

  clearToken() {
    sessionStorage.removeItem('authToken');
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  // GET mit request und parameter
  private getText(request: string, extra: Record<string, string> = {}): Observable<string> {
    let params = new HttpParams().set('request', request).set('_', Date.now().toString());

    for (const [k, v] of Object.entries(extra)) params = params.set(k, v);

    return this.http.get(this.baseUrl, { params, responseType: 'text' });
  }

  private getJson<T>(request: string, extra: Record<string, string> = {}): Observable<T> {
    let params = new HttpParams().set('request', request).set('_', Date.now().toString());

    for (const [k, v] of Object.entries(extra)) params = params.set(k, v);

    return this.http.get<T>(this.baseUrl, { params });
  }

  // login -> token
  login(userid: string, password: string): Observable<LoginResponse> {
    return this.getJson<LoginResponse>('login', {
      userid: (userid ?? '').trim(),
      password: (password ?? '').trim(),
    });
  }

  // register -> token
  register(payload: {
    userid: string;
    password: string;
    nickname: string;
    fullname: string;
  }): Observable<RegisterResponse> {
    return this.getJson<RegisterResponse>('register', {
      userid: (payload.userid ?? '').trim(),
      password: (payload.password ?? '').trim(),
      nickname: (payload.nickname ?? '').trim(),
      fullname: (payload.fullname ?? '').trim(),
    });
  }

  // ok or error
  validateToken(): Observable<boolean> {
    const token = (this.token ?? '').trim();
    if (!token) return of(false);

    return this.getText('validatetoken', { token }).pipe(
      map((t) => t.trim().toLowerCase() === 'ok'),
      catchError(() => of(false)),
    );
  }

  logout(): Observable<boolean> {
    const token = (this.token ?? '').trim();
    if (!token) return of(true);

    return this.getText('logout', { token }).pipe(
      map((t) => t.trim().toLowerCase() === 'ok' || t.trim() === ''),
      catchError(() => of(false)),
    );
  }

  deregister(): Observable<boolean> {
    const token = (this.token ?? '').trim();
    if (!token) return of(false);

    return this.getText('deregister', { token }).pipe(
      map((t) => t.trim().toLowerCase() === 'ok' || t.trim() === ''),
      catchError(() => of(false)),
    );
  }
}
