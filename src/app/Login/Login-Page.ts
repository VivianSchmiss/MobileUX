import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

type LoginResponse = { status: 'ok' | 'error'; token?: string; message?: string };

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet],
  template: `
    <div class="auth-container">
      <h2>Login</h2>
      <input [(ngModel)]="username" placeholder="Benutzername" />
      <input [(ngModel)]="password" type="password" placeholder="Passwort" />

      <div class="remember-me">
        <input type="checkbox" [(ngModel)]="rememberMe" />
        <span>Angemeldet bleiben</span>
      </div>

      <button (click)="login()">Anmelden</button>

      <p><a routerLink="/register">Noch kein Account?</a></p>
    </div>

    <router-outlet></router-outlet>
  `,
  styleUrls: ['./Login.css'],
})
export class Login {
  username = '';
  password = '';
  rememberMe = true;

  constructor(private http: HttpClient, private router: Router) {}

  private enc(v: string) {
    return encodeURIComponent((v ?? '').trim());
  }

  login() {
    if (!this.username || !this.password) {
      alert('Bitte fülle alle Felder aus.');
      return;
    }

    const url =
      `https://www2.hs-esslingen.de/~nitzsche/api/` +
      `?request=login` +
      `&userid=${this.enc(this.username)}` +
      `&password=${this.enc(this.password)}` +
      `&_=${Date.now()}`; // Cache-Buster

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.get<LoginResponse>(url, { headers }).subscribe({
      next: (data) => {
        if (data?.status === 'ok') {
          // ✅ Token & userid speichern
          if (data.token) sessionStorage.setItem('authToken', data.token);
          sessionStorage.setItem('userid', this.username);

          // Optional: "Angemeldet bleiben" = localStorage statt sessionStorage
          if (this.rememberMe && data.token) {
            localStorage.setItem('auth_token', data.token);
          }

          // ✅ Nach erfolgreichem Login direkt zur ChatFeed-Seite navigieren
          this.router.navigate(['/chat-feed']);
        } else {
          alert('Login fehlgeschlagen: ' + (data?.message ?? 'Unbekannter Fehler'));
        }
      },
      error: (err) => {
        console.error(err);
        alert('Fehler beim Login');
      },
    });
  }

  register() {
    this.router.navigate(['/register']);
  }
}
