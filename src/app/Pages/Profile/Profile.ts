import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LogoutButton } from '../Logout/Logout';
import { DeregisterButton } from '../Deregister/Deregister';
import { ChatService } from '../../services/chat.service';
import type { Profile as ApiProfile } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, LogoutButton, DeregisterButton],
  templateUrl: './Profile.html',
  styleUrls: ['./Profile.css'],
})
export class Profile implements OnInit {
  userid = '';
  name = '';
  loginUser = '';
  hasToken = false;

  constructor(
    private router: Router,
    private chatService: ChatService,
    private auth: AuthService,
  ) {}

  ngOnInit() {
    this.userid = sessionStorage.getItem('userid') ?? 'unbekannt';
    this.hasToken = this.auth.isLoggedIn();
    this.loginUser = sessionStorage.getItem('loginUser') ?? '';

    const storedNick =
      sessionStorage.getItem('nickname') ??
      sessionStorage.getItem('usernick') ??
      sessionStorage.getItem('nick') ??
      '';

    const loginUser = sessionStorage.getItem('loginUser') ?? '';

    this.name = storedNick || loginUser || this.userid;

    if (!this.hasToken) return;

    const myHash = (
      sessionStorage.getItem('userhash') ??
      sessionStorage.getItem('hash') ??
      ''
    ).trim();

    this.chatService.getProfiles().subscribe({
      next: (profiles) => {
        const me = profiles.find((p) => String(p.hash).trim() === myHash);
        this.name = me?.nickname ?? this.name;
      },
      error: (err) => {
        console.error('Profil konnte nicht geladen werden.', err);
        alert('Profil konnte gerade nicht geladen werden.');
      },
    });
  }

  goToChatFeed() {
    this.router.navigate(['/chat-feed']);
  }
}
