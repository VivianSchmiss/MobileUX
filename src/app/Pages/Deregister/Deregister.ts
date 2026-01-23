import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-deregister-button',
  standalone: true,
  imports: [CommonModule],
  template: ` <button class="danger-btn" (click)="deleteAccount()">Account löschen</button> `,
  styleUrls: ['./Deregister.css'],
})
export class DeregisterButton {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  deleteAccount() {
    const really = confirm('Willst du deinen Account wirklich löschen?');
    if (!really) return;

    if (!this.auth.token) {
      alert('Kein Token gefunden. Bitte neu einloggen.');
      this.router.navigate(['/login']);
      return;
    }

    this.auth.deregister().subscribe({
      next: (ok) => {
        if (!ok) {
          alert('Account konnte nicht gelöscht werden.');
          return;
        }

        alert('Dein Account wurde gelöscht.');
        this.auth.clearToken();
        sessionStorage.clear();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Deregister error:', err);
        alert('Account konnte nicht gelöscht werden.');
      },
    });
  }
}
