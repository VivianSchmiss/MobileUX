import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ChatService, Profile, Chat, Invite, Message } from '../services/chat.service';
import { LogoutButton } from '../Logout/Logout';
import { DeregisterButton } from '../Deregister/Deregister';
import { ChatFeed } from '../Chat-Feed/ChatFeed';

@Component({
  selector: 'app-invites-button',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './Invites.html',
  styleUrls: ['./Invites.css'],
})
export class Invites implements OnInit {
  invites: Invite[] = [];
  loading = true;
  error: string | null = null;
  menuOpen = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private chatService: ChatService,
  ) {}

  ngOnInit() {
    this.loadInvites();
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
    this.menuOpen = false; // Menü nach Klick schließen
  }

  loadInvites() {
    this.loading = true;
    this.error = null;

    this.chatService.getInvites().subscribe({
      next: (invites) => {
        this.invites = invites;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Einladungen konnten nicht geladen werden';
      },
    });
  }

  joinInvite(chatId: string) {
    this.chatService.joinChat(chatId).subscribe({
      next: () => {
        // Einladung aus Liste entfernen
        this.invites = this.invites.filter((i) => i.id !== chatId);
      },
      error: () => {
        this.error = 'Einladung konnte nicht angenommen werden';
      },
    });
  }

  declineInvite(chatId: string) {
    this.chatService.leaveChat(chatId).subscribe({
      next: () => {
        // Invite aus UI entfernen
        this.invites = this.invites.filter((i) => i.id !== chatId);
      },
      error: () => {
        this.error = 'Einladung konnte nicht abgelehnt werden';
      },
    });
  }

  goBack() {
    this.router.navigate(['/chat-feed']);
  }
}
