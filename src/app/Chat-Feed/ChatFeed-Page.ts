import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LogoutButton } from '../Logout/Logout-Button';
import { DeregisterButton } from '../Deregister/Deregister-Button';

@Component({
  selector: 'app-chat-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, LogoutButton, DeregisterButton],
  template: `
    <div class="chat-feed">
      <header class="chat-header">
        <h2>Chat Feed</h2>
        <div class="menu-wrapper">
          <button class="menu-button" (click)="menuOpen = !menuOpen">⋮</button>
          <div class="menu-dropdown" *ngIf="menuOpen">
            <!-- Hier die beiden Komponenten -->
            <app-logout-button></app-logout-button>
            <app-deregister-button></app-deregister-button>
          </div>
        </div>
      </header>

      <!-- Nachrichtenliste -->
      <ul class="messages-list">
        <li *ngFor="let msg of messages">
          <div class="row1">
            <span class="nick">{{ msg.usernick }}</span>
            <span class="time">{{ msg.time }}</span>
          </div>
          <div class="text">{{ msg.text }}</div>
        </li>
      </ul>

      <!-- Fehler -->
      <p class="error" *ngIf="errorMessage">{{ errorMessage }}</p>
    </div>
  `,
  styleUrls: ['./ChatFeed.css'],
})
export class ChatFeed implements OnInit, OnDestroy {
  messages: Array<{ usernick: string; text: string; time: string }> = [];
  errorMessage = '';
  menuOpen = false;

  private pollHandle: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // direkt initial laden
    this.loadMessages();

    // alle 3 Sekunden aktualisieren (Polling für neue Chats)
    this.pollHandle = setInterval(() => {
      this.loadMessages(true);
    }, 3000);
  }

  ngOnDestroy() {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
    }
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  loadMessages(isPoll = false) {
    // 1. Token holen
    const token = sessionStorage.getItem('authToken') ?? localStorage.getItem('auth_token') ?? '';

    if (!token) {
      this.errorMessage = 'Kein Token gefunden. Bitte neu einloggen.';
      this.messages = [];
      return;
    }

    // 2. URL mit Token + Cache-Buster zusammenbauen (genau wie im Vue-Screenshot)
    const chatUrl =
      `https://www2.hs-esslingen.de/~nitzsche/api/` +
      `?request=getchats` +
      `&token=${encodeURIComponent(token)}` +
      `&t=${Date.now()}`;

    // 3. Request schicken (kein Bearer-Header nötig, Token steckt in der URL)
    this.http.get<any>(chatUrl).subscribe({
      next: (data) => {
        // Erwartete Struktur aus deinem Screenshot:
        // { status: "ok", chats: [...] }
        if (data.status === 'ok') {
          this.messages = data.chats;
          if (!isPoll) {
            this.errorMessage = '';
          }
        } else {
          this.errorMessage =
            'Fehler beim Laden der Chats: ' + (data.message ?? 'Unbekannter Fehler');
        }
      },
      error: (err) => {
        console.error('Fehler beim Abrufen der Chats:', err);
        this.errorMessage = 'Netzwerkfehler oder Server nicht erreichbar.';
      },
    });
  }
}
