import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-logout-button',
  standalone: true,
  imports: [CommonModule],
  template: ` <button class="logout-btn" (click)="logout()">Logout</button> `,
  styleUrls: ['./Logout.css'],
})
export class LogoutButton {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  logout() {
    // local session beenden
    if (!this.auth.token) {
      this.clearAndRedirect();
      return;
    }

    this.auth.logout().subscribe({
      next: () => this.clearAndRedirect(),
      error: (err) => {
        console.error('Logout error:', err);
        alert('Logout fehlgeschlagen.');
        this.clearAndRedirect();
      },
    });
  }

  private clearAndRedirect() {
    this.auth.clearToken();
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}
