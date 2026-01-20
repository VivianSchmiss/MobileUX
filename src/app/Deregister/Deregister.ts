import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-deregister-button',
  standalone: true,
  imports: [CommonModule],
  template: ` <button class="danger-btn" (click)="deleteAccount()">Account löschen</button> `,
})
export class DeregisterButton {
  private deleteUrl =
    'https://www2.hs-esslingen.de/~nitzsche/map/chat/api/?request=deregister&token=${token}';

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  deleteAccount() {
    const really = confirm('Willst du deinen Account wirklich löschen?');
    if (!really) return;

    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('authToken');
    if (!token) {
      alert('Kein Token gefunden. Bitte neu einloggen.');
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.delete(this.deleteUrl, { headers }).subscribe({
      next: (res: any) => {
        console.log('Account gelöscht:', res);
        alert('Dein Account wurde gelöscht.');
        localStorage.removeItem('auth_token');
        sessionStorage.clear();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Fehler beim Löschen:', err);
        alert('Account konnte nicht gelöscht werden.');
      },
    });
  }
}
