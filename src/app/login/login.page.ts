import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet],
  template: `
    <div class="auth-container">
      <h2>Login</h2>
      <div *ngIf="error" class="error">{{ error }}</div>
      <input [(ngModel)]="username" placeholder="Benutzername" />
      <input [(ngModel)]="password" type="password" placeholder="Passwort" />
      <button (click)="login()">Anmelden</button>

      <p><a routerLink="/register">Noch kein Konto?</a></p>
    </div>

    <!-- Hier rendert die Register-Seite -->
    <router-outlet></router-outlet>
  `,
})
export class Login {
  username = '';
  password = '';
  error = '';

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    this.http
      .post<any>('https://www2.hs-esslingen.de/~nitzsche/api/login', {
        username: this.username,
        password: this.password,
      })
      .subscribe({
        next: (res) => {
          localStorage.setItem('auth_token', res.token);
          this.router.navigate(['/chat-feed']);
        },
        error: () => (this.error = 'Login fehlgeschlagen.'),
      });
  }
}
