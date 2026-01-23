import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './Footer.html',
  styleUrls: ['./Footer.css'],
})
export class Footer {
  @Input() invitesCount: number | null = null;
  @Input() chatMode = false;
  @Input() message = '';
  @Output() messageChange = new EventEmitter<string>();
  @Output() send = new EventEmitter<void>();
  @Output() camera = new EventEmitter<void>();
  @Output() location = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();
  @Input() locationLoading = false;

  showAllMenu = false;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  toggleAllMenu() {
    this.showAllMenu = !this.showAllMenu;
  }

  closeAllMenu() {
    this.showAllMenu = false;
  }

  onMenuFile() {
    this.closeAllMenu();
    this.onPickFile();
  }

  onMenuCamera() {
    this.closeAllMenu();
    this.camera.emit();
  }

  onMenuLocation() {
    this.closeAllMenu();
    this.location.emit();
  }

  onPickFile() {
    if (!this.fileInput) return;
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.fileSelected.emit(file);
  }

  onSend() {
    this.send.emit();
  }

  onMessageInput(v: string) {
    this.message = v;
    this.messageChange.emit(v);
  }

  onEnter() {
    this.send.emit();
  }
}
