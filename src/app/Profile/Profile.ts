import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { LogoutButton } from '../Logout/Logout';
import { DeregisterButton } from '../Deregister/Deregister';

import { HttpClient, HttpHeaders } from '@angular/common/http';

import { ChatService, Chat, Message } from '../services/chat.service';

import { ActivatedRoute } from '@angular/router';
import { Invites } from '../Chat/Invites';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, LogoutButton, DeregisterButton],
  templateUrl: './Profile.html',
  styleUrls: ['./Profile.css'],
})
export class Profile implements OnInit {
  userid: string = '';
  hasToken = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.userid = sessionStorage.getItem('userid') ?? 'unbekannt';
    this.hasToken = !!sessionStorage.getItem('token'); // falls du token so speicherst
  }

  goToChatFeed() {
    this.router.navigate(['/chat-feed']);
  }
}
