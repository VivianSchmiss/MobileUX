/*import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ChatService, Message } from '../services/chat.service';
import { LogoutButton } from '../Logout/Logout-Button';
import { DeregisterButton } from '../Deregister/Deregister-Button';
import { ChatFeed } from '../Chat-Feed/ChatFeed-Page';

interface Invite {
  chatid: string;
  chatname?: string;
  fromuser?: string;
}
@Component({
  selector: 'app-invite-chat',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="invites-page">
      <header class="chat-header">
        <h2>Deine Einladungen</h2>

        <div class="menu-wrapper">
          <button class="menu-button" (click)="menuOpen = !menuOpen">⋮</button>
          <div class="menu-dropdown" *ngIf="menuOpen">
            <button class="menu-item" (click)="navigateTo('/Invite-Chat')">Einladungen</button>
          </div>
        </div>
      </header>

      <div class="invites-list" *ngIf="!loading; else loadingTpl">
        <div *ngIf="invites.length > 0; else noInvitesTpl" class="invites-grid">
          <div *ngFor="let invite of invites" class="invite-card">
            <div class="invite-info">
              <small *ngIf="invite.invitedhash">von: {{ invite.invitedhash }}</small>
            </div>

            <div class="invite-actions">
              <button class="btn-join" (click)="joinInvite(invite.chatid)">Beitreten</button>
              <button class="btn-decline" (click)="declineInvite(invite.chatid)">Ablehnen</button>
            </div>
          </div>
        </div>

        <ng-template #noInvitesTpl>
          <p class="no-invites">Du hast derzeit keine Einladungen.</p>
        </ng-template>
      </div>

      <ng-template #loadingTpl>
        <div class="loading">Lade Einladungen...</div>
      </ng-template>

      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
    </div>
  `,
  styleUrls: ['./Invite-Chat.css'],
})
export class Invites implements OnInit {
  invites: Invites[] = [];
  loading = true;
  errorMessage = '';
  menuOpen = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.fetchInvites();
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
    this.menuOpen = false; // Menü nach Klick schließen
  }

  fetchInvites() {
    console.log('invites loaded', this.invites);

    const token = sessionStorage.getItem('authToken') || localStorage.getItem('auth_token');

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const url =
      `https://www2.hs-esslingen.de/~nitzsche/api/` +
      `?request=getinvites` +
      `&token=${encodeURIComponent(token)}`;

    this.loading = true;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        if (data.status === 'ok') {
          this.invites = (data.invites ?? []).map((raw: any) => ({
            chatid: String(raw.chatid),
            chatname: raw.chatname ?? undefined,
            fromuser: raw.fromuser ?? raw.userid ?? undefined,
          }));
          this.errorMessage = '';
        } else {
          this.errorMessage = data.message || 'Fehler beim Laden der Einladungen.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Fehler beim Laden der Einladungen:', err);
        this.errorMessage = 'Netzwerkfehler beim Laden der Einladungen.';
        this.loading = false;
      },
    });
  }
  joinInvite(chatid: string) {
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('auth_token');
    if (!token) {
      alert('Nicht eingeloggt.');
      this.router.navigate(['/login']);
      return;
    }

    const url =
      `https://www2.hs-esslingen.de/~nitzsche/api/` +
      `?request=joinchat` +
      `&token=${encodeURIComponent(token)}` +
      `&chatid=${encodeURIComponent(chatid)}`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        if (data.status === 'ok') {
          this.router.navigate(['/chat', chatid]);
        } else {
          alert('Fehler beim Beitreten: ' + (data.message ?? 'Unbekannter Fehler'));
        }
      },
      error: (err) => {
        console.error(err);
        alert('Netzwerkfehler beim Beitreten.');
      },
    });
  }

  declineInvite(chatid: string) {
    // aktuell nur lokal aus der Liste löschen:
    this.invites = this.invites.filter((i) => i.chatid !== chatid);
  }
}*/
