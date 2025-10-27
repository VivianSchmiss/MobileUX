import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

type RegisterResponse = { status: 'ok' | 'error'; token?: string; info?: string };

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <h2>Registrieren</h2>

      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>

      <input [(ngModel)]="userId" placeholder="User ID" />
      <input [(ngModel)]="password" type="password" placeholder="Passwort" />
      <input [(ngModel)]="nickname" placeholder="Nickname" />
      <input [(ngModel)]="fullname" placeholder="Vollständiger Name" />

      <button (click)="register()">Registrieren</button>

      <p><a routerLink="/login">Ich habe einen Account</a></p>
    </div>
  `,
  styleUrls: ['./Register.css'],
})
export class Register {
  userId = '';
  nickname = '';
  fullname = '';
  password = '';
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  private enc(v: string) {
    return encodeURIComponent((v ?? '').trim());
  }

  register() {
    // 1) Felder prüfen
    if (!this.userId || !this.password || !this.nickname || !this.fullname) {
      this.errorMessage = 'Bitte fülle alle Felder aus.';
      return;
    }
    this.errorMessage = '';

    // 2) URL wie im Screenshot (GET mit Query-Params + Cache-Buster)
    const apiUrl =
      `https://www2.hs-esslingen.de/~nitzsche/api/` +
      `?request=register` +
      `&userid=${this.enc(this.userId)}` +
      `&password=${this.enc(this.password)}` +
      `&nickname=${this.enc(this.nickname)}` +
      `&fullname=${this.enc(this.fullname)}` +
      `&_=${Date.now()}`;

    // 3) Request ausführen
    this.http.get<RegisterResponse>(apiUrl).subscribe({
      next: (data) => {
        if (data?.status === 'ok') {
          if (data.token) {
            sessionStorage.setItem('authToken', data.token);
          }
          alert('Registrierung erfolgreich! Du wirst weitergeleitet.');
          this.router.navigate(['/chat-feed']); // oder '/ChatlistPage' falls so gewünscht
        } else {
          this.errorMessage = data?.info || 'Registrierung fehlgeschlagen.';
        }
      },
      error: () => {
        this.errorMessage = 'Netzwerkfehler oder Server nicht erreichbar.';
      },
    });
  }
}
