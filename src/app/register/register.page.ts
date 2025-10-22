import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <h2>Registrieren</h2>

      <div *ngIf="message" class="success">{{ message }}</div>

      <input [(ngModel)]="userId" placeholder="UserId" />
      <input [(ngModel)]="username" placeholder="Vollständier Name" />
      <input [(ngModel)]="password" type="password" placeholder="Passwort" />

      <button (click)="register()">Registrieren</button>

      <p><a routerLink="/login">Schon registriert?</a></p>
    </div>
  `,
})
export class Register {
  userId = '';
  username = '';
  password = '';
  message: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  register() {
    this.http
      .post<any>('https://www2.hs-esslingen.de/~nitzsche/api/register', {
        userId: this.userId,
        username: this.username,
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.message = 'Registrierung erfolgreich!';
          setTimeout(() => this.router.navigate(['/login']), 1000);
        },
      });
  }
}
