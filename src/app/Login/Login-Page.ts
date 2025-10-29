import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

// was der Server zurückschickt
type LoginResponse = { status: 'ok' | 'error'; token?: string; message?: string };

@Component({
  selector: 'app-login', // kann man woanders einbinden als Komponente
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

  // wichtig fpr den Login-Request
  constructor(private http: HttpClient, private router: Router, private authService: AuthService) {}

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

    this.http.get<LoginResponse>(url).subscribe({
      next: (data) => {
        if (data?.status === 'ok' && data.token) {
          // true = Token in localStorage (persistent über Browser-Neustart)
          // false = Token nur in sessionStorage (lebt bis der tab geschlossen ist)
          // trennt "dauerhaft eingeloggt bleiben" und "nur für diese Sitzung"
          this.authService.setToken(data.token, this.rememberMe);
          sessionStorage.setItem('userid', this.username); // username wird zusätzlch im sessionStorage gespeichert, damit man später sieht wer eingeloggt ist
          this.router.navigate(['/chat-feed']);
        } else {
          alert('Login fehlgeschlagen: ' + (data?.message ?? 'Unbekannter Fehler'));
        }
        console.log(data);
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
