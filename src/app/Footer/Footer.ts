import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './Footer.html',
  styleUrls: ['./Footer.css'],
})
export class Footer {
  @Input() invitesCount: number | null = null;
}
