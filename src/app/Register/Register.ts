import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// was Server zurückschickt
type RegisterResponse = { status: 'ok' | 'error'; token?: string; info?: string };

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './Register.html',
  styleUrls: ['./Register.css'],
})
export class Register {
  userId = ''; // leerer String, damit Angular keine undefined bindet
  nickname = '';
  fullname = '';
  password = '';
  errorMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  // Wegen Query-Parameter &userid muss URL encodiert werden, damit es nicht kaputt geht wegen den Sonderzeichen
  private enc(v: string) {
    return encodeURIComponent((v ?? '').trim());
  }

  register() {
    if (!this.userId || !this.password || !this.nickname || !this.fullname) {
      this.errorMessage = 'Bitte fülle alle Felder aus.';
      return;
    }
    this.errorMessage = '';

    const apiUrl =
      `https://www2.hs-esslingen.de/~nitzsche/api/` +
      `?request=register` +
      `&userid=${this.enc(this.userId)}` +
      `&password=${this.enc(this.password)}` +
      `&nickname=${this.enc(this.nickname)}` +
      `&fullname=${this.enc(this.fullname)}` +
      `&_=${Date.now()}`;

    this.http.get<RegisterResponse>(apiUrl).subscribe({
      next: (data) => {
        if (data?.status === 'ok') {
          if (data.token) {
            sessionStorage.setItem('authToken', data.token);
          }
          alert('Registrierung erfolgreich! Du wirst weitergeleitet.');
          this.router.navigate(['/chat-feed']);
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
