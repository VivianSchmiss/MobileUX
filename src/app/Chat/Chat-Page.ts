import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ChatService, Message, Profile } from '../services/chat.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './Chat.html',
  styleUrls: ['./Chat-Page.css'],
})
export class Chat implements OnInit, AfterViewInit {
  @ViewChild('messagesContainer')
  messagesContainer!: ElementRef<HTMLDivElement>;

  messages: Message[] = [];
  chatId!: string;
  chatName = '';
  loading = true;
  newMessage = '';
  currentUser = sessionStorage.getItem('userid') || 'Ich';
  private viewInitialized = false;

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  showPhotoContainer = false;
  streamActive = false;
  private cameraStream: MediaStream | null = null;

  photoFile: File | null = null;
  previewUrl: string | null = null;

  locationLoading = false;

  showAttachmentMenu = false;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private router: Router
  ) {}

  ngOnInit() {
    this.chatId = this.route.snapshot.paramMap.get('id') ?? '';

    this.chatService.getChats().subscribe({
      next: (chats) => {
        const found = chats.find((c) => c.id === this.chatId);
        this.chatName = found?.name ?? '';
      },
    });
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
    this.chatService.getMessages(this.chatId, 0).subscribe({
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
    // Text aus dem Eingabefeld (newMessage benutzt du schon überall)
    const content = this.newMessage.trim();

    // nichts eingegeben & kein Foto -> nichts tun
    if (!content && !this.photoFile) return;

    // BEDINGUNG: Foto darf nur mit Nachricht gesendet werden
    if (this.photoFile && !content) {
      alert('Ein Foto darf nur zusammen mit einer Nachricht gesendet werden.');
      return;
    }

    const tempId = Math.random().toString();

    const tempMessage: Message = {
      id: tempId,
      chatId: this.chatId,
      sender: this.currentUser,
      content,
      imageUrl: this.previewUrl ?? null, // wenn Foto vorhanden, lokale Vorschau anzeigen
      createdAt: new Date().toISOString(),
    };

    this.messages.push(tempMessage);
    this.newMessage = '';
    setTimeout(() => this.scrollToBottom());

    // Entscheiden: Bild + Text oder nur Text
    const request$ =
      this.photoFile && content
        ? this.chatService.sendImage(this.chatId, this.photoFile, content) // Bild + Text
        : this.chatService.sendMessage(this.chatId, content); // nur Text

    request$.subscribe({
      next: (msg) => {
        const index = this.messages.findIndex((m) => m.id === tempId);
        if (index >= 0) this.messages[index] = msg;

        // Aufräumen, wenn Foto dabei war
        if (this.photoFile) {
          this.photoFile = null;
          if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
            this.previewUrl = null;
          }
          this.showPhotoContainer = false;
        }

        this.loadMessages(); // wie in deiner alten Version
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

  async openCamera() {
    this.showPhotoContainer = true;

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

        // Vorschau-URL aktualisieren
        if (this.previewUrl) {
          URL.revokeObjectURL(this.previewUrl);
        }
        this.previewUrl = URL.createObjectURL(blob);

        // Blob als File speichern -> wird später an sendImage übergeben
        this.photoFile = new File([blob], 'photo.jpg', {
          type: blob.type || 'image/jpeg',
        });
      },
      'image/jpeg',
      0.9
    );
  }

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

    this.showPhotoContainer = false;
  }

  removePhoto() {
    this.photoFile = null;

    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.previewUrl = null;

    this.showPhotoContainer = false;
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

        this.chatService.sendMessage(this.chatId, link).subscribe({
          next: (msg) => {
            this.messages.push(msg);
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

  leaveChat() {
    if (!this.chatId) {
      return;
    }

    this.loading = true;

    this.chatService.leaveChat(this.chatId).subscribe({
      next: () => {
        this.router.navigate(['/chat-feed']);
      },
      error: (err) => {
        console.error('Error leaving chat', err);
        this.loading = false;
      },
    });
  }
}
