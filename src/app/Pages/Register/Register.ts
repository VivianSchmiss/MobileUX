import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService, RegisterResponse } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './Register.html',
  styleUrls: ['./Register.css'],
})
export class Register {
  userId = '';
  nickname = '';
  fullname = '';
  password = '';
  errorMessage = '';

  constructor(
    private router: Router,
    private auth: AuthService,
  ) {}

  register() {
    const userid = (this.userId ?? '').trim();
    const pw = (this.password ?? '').trim();
    const nick = (this.nickname ?? '').trim();
    const full = (this.fullname ?? '').trim();

    if (!userid || !pw || !nick || !full) {
      this.errorMessage = 'Bitte fülle alle Felder aus.';
      return;
    }
    this.errorMessage = '';

    this.auth.register({ userid, password: pw, nickname: nick, fullname: full }).subscribe({
      next: (data) => {
        if (data?.status === 'ok') {
          if (data.token) {
            this.auth.setToken(data.token); // session-only
          }
          alert('Registrierung erfolgreich!');
          this.router.navigate(['/chat-feed']);
        } else {
          this.errorMessage = (data as any)?.info || 'Registrierung fehlgeschlagen.';
        }
      },
      error: (err) => {
        console.error('Register error', err);
        this.errorMessage = 'Netzwerkfehler oder Server nicht erreichbar.';
      },
    });
  }
}
