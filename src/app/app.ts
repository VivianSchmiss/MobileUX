import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Footer } from './Footer/Footer';
import { Header } from './Header/Header';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Footer, Header],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class AppComponent {
  showHeader = true;

  showFooter = true;

  headerShowBack = false;

  showNewChatFab = false;

  constructor(private router: Router) {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url = e.urlAfterRedirects as string;

      const isAuth = url === '/login' || url === '/register';
      const isChatDetail = url.startsWith('/chat/');

      this.showHeader = !isAuth;
      this.showFooter = !(isAuth || isChatDetail);
      this.headerShowBack = isChatDetail;

      this.showNewChatFab = url === '/chat-feed';
    });
  }
}
