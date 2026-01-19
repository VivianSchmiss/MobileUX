import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { HeaderService } from '../services/header.service'; // Pfad ggf. anpassen

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
  }

  private updateTitle() {
    // Service-Titel hat Vorrang, sonst Route-Titel
    this.title =
      this.overrideTitle && this.overrideTitle.trim().length > 0
        ? this.overrideTitle
        : this.routeTitle;
  }

  private getDeepestChild(r: ActivatedRoute): ActivatedRoute {
    let current = r;
    while (current.firstChild) current = current.firstChild;
    return current;
  }

  goBack() {
    this.router.navigate(['/chat-feed']);
  }
}
