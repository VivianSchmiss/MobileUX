import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logout-button',
  standalone: true,
  imports: [CommonModule],
  template: ` <button class="logout-btn" (click)="logout()">Logout</button> `,
  styleUrls: ['./Logout.css'],
})
export class LogoutButton {
  private logoutUrl =
    'https://www2.hs-esslingen.de/~nitzsche/map/chat/api/?request=logout&token=${token}';

  // wichtig fpr den Logout-Request
  constructor(private http: HttpClient, private router: Router) {}

  logout() {
    // versucht AUth-Token zu holen (erst aus localStorage, wenn nicht vorhanden dann aus sessionStorage)
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('authToken');
    if (!token) {
      this.clearAndRedirect();
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    // Bneutzer wi
    this.http.post(this.logoutUrl, {}, { headers }).subscribe({
      next: (res: any) => {
        console.log('Logout:', res);
        this.clearAndRedirect();
      },
      error: (err) => {
        console.error('Logout error:', err);
        this.clearAndRedirect();
      },
    });
  }

  private clearAndRedirect() {
    localStorage.removeItem('auth_token');
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}
