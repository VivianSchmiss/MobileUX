import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderService } from '../../services/header.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './Header.html',
  styleUrls: ['./Header.css'],
})
export class Header {
  @Input() showBack = false;

  title = '';
  showMenuButton = false;
  menuOpen = false;
  isChatOwner = false;
  isChatContext = false;

  private routeTitle = '';
  private overrideTitle: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private headerService: HeaderService,
  ) {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      const deepest = this.getDeepestChild(this.route);
      this.routeTitle = deepest.snapshot.data?.['title'] ?? '';
      this.updateTitle();
    });

    this.headerService.title$.subscribe((t) => {
      this.overrideTitle = t;
      this.updateTitle();
    });

    this.headerService.isChatOwner$.subscribe((v) => {
      setTimeout(() => (this.isChatOwner = !!v), 0);
    });

    this.headerService.isChatContext$.subscribe((v) => {
      setTimeout(() => (this.isChatContext = !!v), 0);
    });
  }

  ngOnInit() {
    const deepest = this.getDeepestChild(this.route);
    this.routeTitle = deepest.snapshot.data?.['title'] ?? '';
    this.updateTitle();

    this.headerService.showMenu$.subscribe((show) => {
      setTimeout(() => {
        this.showMenuButton = show;
        if (!show) this.menuOpen = false;
      }, 0);
    });

    this.headerService.isChatOwner$.subscribe((isOwner) => {
      setTimeout(() => {
        this.isChatOwner = !!isOwner;
      }, 0);
    });

    this.headerService.isChatContext$.subscribe((inChat) => {
      setTimeout(() => {
        this.isChatContext = !!inChat;
      }, 0);
    });
  }

  ngAfterViewInit() {
    window.addEventListener('click', this.closeMenuBound);
  }

  ngOnDestroy() {
    window.removeEventListener('click', this.closeMenuBound);
  }

  emitHeaderAction(action: 'leave' | 'delete') {
    console.log('[Header] emitHeaderAction', action);

    window.dispatchEvent(new CustomEvent('header-action', { detail: action }));
  }

  toggleMenu(ev?: MouseEvent) {
    ev?.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  goBack() {
    this.router.navigate(['/chat-feed']);
  }

  private removeWindowClick?: () => void;

  private closeMenuBound = () => this.closeMenu();

  private updateTitle() {
    const nextTitle =
      this.overrideTitle && this.overrideTitle.trim().length > 0
        ? this.overrideTitle
        : this.routeTitle;

    setTimeout(() => {
      this.title = nextTitle || '';
    }, 0);
  }

  private getDeepestChild(r: ActivatedRoute): ActivatedRoute {
    let current = r;
    while (current.firstChild) current = current.firstChild;
    return current;
  }
}
