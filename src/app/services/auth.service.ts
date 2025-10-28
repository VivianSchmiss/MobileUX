import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AuthService {
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
}
