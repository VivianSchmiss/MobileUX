import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, LoginResponse } from '../../services/auth.service';

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

  constructor(
    private router: Router,
    private auth: AuthService,
  ) {}

  login() {
    const userid = (this.username ?? '').trim();
    const pw = (this.password ?? '').trim();

    if (!userid || !pw) {
      alert('Bitte fülle alle Felder aus.');
      return;
    }

    this.auth.login(userid, pw).subscribe({
      next: (data: LoginResponse) => {
        if (data.status !== 'ok') {
          alert(
            'Login fehlgeschlagen: ' +
              (data?.message ?? (data as any)?.info ?? 'Unbekannter Fehler'),
          );
          return;
        }

        // token session-only
        this.auth.setToken(data.token);

        // einheitliche keys
        sessionStorage.setItem('loginUser', userid);
        sessionStorage.setItem('userid', userid);

        const hash = (data.hash ?? data.userhash ?? '').toString();
        if (hash) {
          sessionStorage.setItem('userhash', hash);
          sessionStorage.setItem('hash', hash); // fallback
        }

        this.password = '';
        this.router.navigate(['/chat-feed']);
      },
      error: (err) => {
        console.error('Fehler beim Login', err);
        alert('Fehler beim Login.');
      },
    });
  }

  register() {
    this.router.navigate(['/register']);
  }
}
