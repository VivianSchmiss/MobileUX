import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs';
import { Footer } from './Navigation/Footer/Footer';
import { Header } from './Navigation/Header/Header';

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
  isChatDetail = false;
  chatMessage = '';
  chatLocationLoading = false;
  contentNoScroll = false;

  constructor(private router: Router) {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e: any) => {
      const url = e.urlAfterRedirects as string;

      const isAuth = url === '/login' || url === '/register';
      this.isChatDetail = url.startsWith('/chat/');

      const isCreateChat = url === '/create-chat';

      this.showHeader = !isAuth;

      this.showFooter = !isAuth && !isCreateChat;

      this.headerShowBack = this.isChatDetail || isCreateChat;

      this.contentNoScroll = isCreateChat;

      this.showNewChatFab = url === '/chat-feed';
    });
  }

  private getDeepestChild(r: ActivatedRoute): ActivatedRoute {
    let current = r;
    while (current.firstChild) current = current.firstChild;
    return current;
  }

  onChatSend() {
    window.dispatchEvent(new CustomEvent('chat-footer-send', { detail: this.chatMessage }));
    this.chatMessage = '';
  }

  onChatCamera() {
    window.dispatchEvent(new CustomEvent('chat-footer-camera'));
  }

  onChatLocation() {
    window.dispatchEvent(new CustomEvent('chat-footer-location'));
  }

  onChatFile(file: File) {
    window.dispatchEvent(new CustomEvent('chat-footer-file', { detail: file }));
  }
}
