import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

// was Server zurückschickt
type LoginResponse =
  | { status: 'ok'; token: string; hash: string; message?: string; code?: number }
  | { status: 'error'; message?: string; code?: number };

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet],
  templateUrl: './Login.html',
  styleUrls: ['./Login.css'],
})
export class Login {
  username = '';
  password = '';
  rememberMe = true;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
  ) {}

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
        console.log('[LoginResponse]', data);
        console.log('[LoginResponse keys]', Object.keys(data as any));
        console.log('[LoginResponse token]', (data as any).token);
        console.log('[LoginResponse hash]', (data as any).hash);
        console.log('[LoginResponse userhash]', (data as any).userhash);

        if (data.status === 'ok') {
          this.authService.setToken(data.token, this.rememberMe);

          sessionStorage.setItem('loginUser', this.username);

          // für chat
          sessionStorage.setItem('userid', this.username);

          // für profil
          sessionStorage.setItem('userhash', data.hash);
          sessionStorage.setItem('hash', data.hash); // fallback

          console.log('[Login] saved userid:', sessionStorage.getItem('userid'));
          console.log('[Login] saved userhash:', sessionStorage.getItem('userhash'));
          console.log('[Login] saved hash:', sessionStorage.getItem('hash'));

          this.router.navigate(['/chat-feed']);

          setTimeout(() => {
            console.log('[Login after 1s] userid:', sessionStorage.getItem('userid'));
            console.log('[Login after 1s] userhash:', sessionStorage.getItem('userhash'));
            console.log('[Login after 1s] hash:', sessionStorage.getItem('hash'));
          }, 1000);
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
