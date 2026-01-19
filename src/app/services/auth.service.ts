import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private baseUrl = 'https://www2.hs-esslingen.de/~nitzsche/api/';

  constructor(private http: HttpClient) {}

  get token(): string | null {
    return sessionStorage.getItem('authToken') || localStorage.getItem('auth_token');
  }

  setToken(token: string, rememberMe = false) {
    sessionStorage.setItem('authToken', token);
    if (rememberMe) {
      localStorage.setItem('auth_token', token);
    }
  }

  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    });
  }

  isLoggedIn(): boolean {
    return this.token != null;
  }

  validateToken(): Observable<boolean> {
    const token = this.token;
    if (!token) return of(false);

    // API: validatetoken + token
    const url = `${this.baseUrl}validatetoken?token=${encodeURIComponent(token)}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      map((res) => res.trim().toLowerCase() === 'ok'),
      catchError(() => of(false)),
    );
  }

  clearToken() {
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('auth_token');
  }
}
