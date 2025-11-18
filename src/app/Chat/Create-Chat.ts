import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatService, Profile } from '../services/chat.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-create-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './Create-Chat.html',
  styleUrls: ['./Create-Chat.css'],
})
export class CreateChat implements OnInit {
  chatName = '';
  loadingProfiles = false;
  profiles: Profile[] = [];
  selectedUserHash: string[] = []; // mehrere
  submitting = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private chatService: ChatService, private router: Router) {}

  ngOnInit() {
    this.loadProfiles();
  }
  loadProfiles() {
    this.loadingProfiles = true;

    this.chatService.getProfiles().subscribe({
      next: (profiles) => {
        this.loadingProfiles = false;

        const me = sessionStorage.getItem('userid') ?? ''; // mich rausnehmen
        this.profiles = profiles.filter((p) => p.hash !== me);
      },
      error: () => {
        this.error = 'Profile konnten nicht geladen werden.';
        this.loadingProfiles = false;
      },
    });
  }

  // Mehrere User auswählen
  toggleUser(hash: string) {
    if (this.selectedUserHash.includes(hash)) {
      this.selectedUserHash = this.selectedUserHash.filter((h) => h !== hash);
    } else {
      this.selectedUserHash.push(hash);
    }
  }

  createChat() {
    this.error = null;
    this.success = null;

    const name = this.chatName.trim();

    if (!name) {
      this.error = 'Chatnamen eingeben';
      return;
    }

    if (this.selectedUserHash.length === 0) {
      this.error = 'Mindestens einen Nutzer auswählen';
      return;
    }

    this.submitting = true;

    this.chatService.createChat(name).subscribe({
      next: (chat) => {
        // pro User: invite(chatid, invitedhash)
        const invites = [...this.selectedUserHash];

        invites.forEach((hash) => {
          this.chatService.invite(chat.id, hash).subscribe({
            error: (err) => console.error('invite fehlgeschlagen für', hash, err),
          });
        });

        this.submitting = false;
        this.success = `Chat "${chat.name}" wurde erstellt`;

        this.chatName = '';
        this.selectedUserHash = [];
        this.router.navigate(['/chat-feed']);
      },
      error: () => {
        this.submitting = false;
        this.error = 'Chat konnte nicht erstellt werden';
      },
    });
  }
}
