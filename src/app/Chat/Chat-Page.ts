import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ChatService, Message } from '../services/chat.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="chat-detail" *ngIf="!loading; else loadingTpl">
      <div #messagesContainer class="messages-container">
        <div *ngFor="let msg of messages" class="message" [class.mine]="msg.sender === currentUser">
          <div class="message-header">
            <span class="sender">{{ msg.sender }}</span>
            <span class="time">{{ msg.createdAt }}</span>
          </div>

          <div class="content" *ngIf="msg.content">
            {{ msg.content }}
          </div>

          <!-- Bildnachricht -->
          <img *ngIf="msg.imageUrl" [src]="msg.imageUrl" alt="Bild" class="image-message" />
        </div>
      </div>

      <div class="message-input">
        <div *ngIf="showPhotoContainer" class="photo-container">
          <!-- Video IMMER im DOM, nur verstecken -->
          <video
            #video
            autoplay
            playsinline
            class="camera-preview"
            [hidden]="!streamActive"
          ></video>

          <canvas #canvas hidden></canvas>

          <img *ngIf="previewUrl" [src]="previewUrl" alt="Foto Vorschau" class="photo-preview" />
        </div>

        <div class="camera-buttons">
          <button *ngIf="!streamActive && !previewUrl" type="button" (click)="openCamera()">
            📷
          </button>
          <button *ngIf="streamActive" type="button" (click)="takePhoto()">📸 Foto machen</button>
          <button *ngIf="streamActive" type="button" (click)="stopCamera()">
            ✖ Kamera stoppen
          </button>
          <button *ngIf="previewUrl" type="button" (click)="removePhoto()">🗑 Foto entfernen</button>
        </div>

        <button type="button" (click)="shareCurrentLocation()" [disabled]="locationLoading">
          📍
        </button>

        <input
          type="text"
          [value]="newMessage"
          (input)="newMessage = $any($event.target).value"
          placeholder="Nachricht schreiben..."
          (keyup.enter)="sendMessage()"
        />

        <input
          #fileInput
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          (change)="onImageSelected($event)"
        />
        <button type="button" (click)="fileInput.click()">🔗</button>

        <button (click)="sendMessage()">➤</button>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div>Loading messages...</div>
    </ng-template>
  `,
  styleUrls: ['./Chat-Page.css'],
})
export class Chat implements OnInit, AfterViewInit {
  // Chat / Messages
  @ViewChild('messagesContainer')
  messagesContainer!: ElementRef<HTMLDivElement>;

  messages: Message[] = [];
  chatId!: string;
  loading = true;
  newMessage = '';
  currentUser = sessionStorage.getItem('userid') || 'Ich';
  private viewInitialized = false;

  // Kamera / Foto
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  showPhotoContainer = false;
  streamActive = false;
  private cameraStream: MediaStream | null = null;

  photoBlob: Blob | null = null;
  previewUrl: string | null = null; // Vorschau des aufgenommenen / ausgewählten Fotos

  locationLoading = false;

  showAttachmentMenu = false;

  constructor(private route: ActivatedRoute, private chatService: ChatService) {}

  ngOnInit() {
    this.chatId = this.route.snapshot.paramMap.get('id')!;
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
    this.loadMessages();
  }

  toggleAttachmentMenu() {
    this.showAttachmentMenu = !this.showAttachmentMenu;
  }

  loadMessages() {
    this.loading = true;
    this.chatService.getMessages(this.chatId).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.loading = false;

        setTimeout(() => this.scrollToBottom());
      },
      error: (err) => {
        console.error('Error loading messages', err);
        this.loading = false;
      },
    });
  }

  sendMessage() {
    const content = this.newMessage.trim();
    if (!content) return;

    const tempId = Math.random().toString();

    const tempMessage: Message = {
      id: tempId,
      chatId: this.chatId,
      sender: this.currentUser,
      content,
      createdAt: new Date().toISOString(),
    };

    this.messages.push(tempMessage);
    this.newMessage = '';
    setTimeout(() => this.scrollToBottom());

    this.chatService.sendMessage(this.chatId, content).subscribe({
      next: (msg) => {
        const index = this.messages.findIndex((m) => m.id === tempId);
        if (index >= 0) this.messages[index] = msg;
        this.loadMessages();
      },
      error: (err) => {
        console.error('Error sending message', err);
      },
    });
  }

  private scrollToBottom() {
    if (!this.viewInitialized || !this.messagesContainer) return;

    const el = this.messagesContainer.nativeElement;
    el.scrollTop = el.scrollHeight;
  }

  // Kamera öffnen
  async openCamera() {
    this.showPhotoContainer = true;

    // kurz warten, bis *ngIf den Video-Tag gerendert hat
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      this.cameraStream = stream;
      const video = this.videoRef.nativeElement;
      video.srcObject = stream;
      this.streamActive = true;
    } catch (err) {
      alert('Kamera konnte nicht geöffnet werden.');
      console.error(err);
    }
  }

  // Foto aufnehmen
  takePhoto() {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;

    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        this.photoBlob = blob;
        // Vorschau-URL erzeugen
        if (this.previewUrl) {
          URL.revokeObjectURL(this.previewUrl);
        }
        this.previewUrl = URL.createObjectURL(blob);

        // Kamera nach dem Foto stoppen
        this.stopCamera();
      },
      'image/jpeg',
      0.9
    );
  }

  // Kamera stoppen
  stopCamera() {
    const video = this.videoRef?.nativeElement;
    const stream = ((video && (video.srcObject as MediaStream)) || this.cameraStream) ?? null;

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (video) {
      video.srcObject = null;
    }

    this.cameraStream = null;
    this.streamActive = false;

    // Container wieder ausblenden, Layout wie vorher
    this.showPhotoContainer = false;
  }

  // Foto entfernen (lokal)
  removePhoto() {
    this.photoBlob = null;
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = null;

    // Container wieder ausblenden, Layout wie vorher
    this.showPhotoContainer = false;
  }

  onImageSelected(event: Event) {
    this.showAttachmentMenu = false;

    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.photoBlob = file;

    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = URL.createObjectURL(file);

    // temporäre Nachricht im Chat anzeigen (wie bei sendMessage)
    const tempId = Math.random().toString();
    const tempMessage: Message = {
      id: tempId,
      chatId: this.chatId,
      sender: this.currentUser,
      content: '',
      imageUrl: this.previewUrl, // lokale Vorschau
      createdAt: new Date().toISOString(),
    };

    this.messages.push(tempMessage);
    setTimeout(() => this.scrollToBottom());

    // an Backend schicken
    this.chatService.sendImage(this.chatId, file).subscribe({
      next: (msg) => {
        const index = this.messages.findIndex((m) => m.id === tempId);
        if (index >= 0) this.messages[index] = msg; // echte Server-Message ersetzen
      },
      error: (err) => {
        console.error('Error sending image', err);
        //Fehlermeldung anzeigen oder tempMessage wieder entfernen
      },
    });

    // Input leeren, sonst feuert (change) beim selben Bild nicht nochmal
    input.value = '';
  }

  shareCurrentLocation() {
    this.showAttachmentMenu = false;

    if (!navigator.geolocation) {
      alert('Geolocation wird von deinem Browser nicht unterstützt.');
      return;
    }

    this.locationLoading = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        const link = `Mein aktueller Standort: https://maps.google.com/?q=${latitude},${longitude}`;

        // direkt als Chatnachricht senden, ohne dass der User was tippen muss
        this.chatService.sendMessage(this.chatId, link).subscribe({
          next: (msg) => {
            this.messages.push(msg); // Nachricht lokal anzeigen
            this.locationLoading = false;
            setTimeout(() => this.scrollToBottom());
          },
          error: (err) => {
            console.error('Error sending location', err);
            this.locationLoading = false;
            alert('Standort konnte nicht gesendet werden.');
          },
        });
      },
      (err) => {
        console.error('Geolocation error', err);
        this.locationLoading = false;

        switch (err.code) {
          case err.PERMISSION_DENIED:
            alert('Zugriff auf den Standort wurde verweigert.');
            break;
          case err.POSITION_UNAVAILABLE:
            alert('Standort nicht verfügbar.');
            break;
          case err.TIMEOUT:
            alert('Standort-Abfrage hat zu lange gedauert.');
            break;
          default:
            alert('Standort konnte nicht abgerufen werden.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }
}
