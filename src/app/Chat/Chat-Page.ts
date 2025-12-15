import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ChatService, Message, Profile } from '../services/chat.service';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';

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

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  messages: Message[] = [];
  chatId!: string;
  chatName = '';
  loading = true;
  newMessage = '';
  //currentUser = sessionStorage.getItem('userid') || 'Ich';
  currentUser = sessionStorage.getItem('userid') ?? '';

  isOwner = false; //
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

        if (!found) {
          this.router.navigate(['/chat-feed']);
          return;
        }

        this.chatName = found.name;

        this.isOwner = (found.role ?? '').trim().toLowerCase() === 'owner';
      },
      error: (err) => {
        console.error('Fehler beim Laden der Chats', err);
        this.router.navigate(['/chat-feed']);
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

  onPickFile() {
    this.showAttachmentMenu = false;
    if (!this.fileInput) return;

    // zurücksetzen, damit dieselbe Datei erneut gewählt werden kann
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Nur PNG-Bilder erlauben
    if (file.type !== 'image/png') {
      alert('Nur PNG-Bilder sind erlaubt.');
      return;
    }

    // altes Preview aufräumen
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.photoFile = file;
    this.previewUrl = URL.createObjectURL(file);
    this.showPhotoContainer = true;
  }

  sendMessage() {
    const content = this.newMessage.trim();

    if (!content && !this.photoFile) return;

    const tempId = 'temp-' + Date.now();

    const tempMessage: Message = {
      id: tempId,
      chatId: this.chatId,
      sender: this.currentUser,
      content: content || null,
      imageUrl: this.photoFile ? this.previewUrl ?? null : null,
      createdAt: new Date().toISOString(),
    };

    // Sofort lokal anzeigen (Text, Foto)
    this.messages.push(tempMessage);
    this.newMessage = '';
    setTimeout(() => this.scrollToBottom());

    // Entscheidung was an Server geht => sendImage: Text & Foto; sendMessage: Text
    let request$: Observable<Message>;

    if (this.photoFile) {
      request$ = this.chatService.sendImage(
        this.chatId,
        this.photoFile,
        content || undefined // wenn leer: nicht in Service angehängt
      );
    } else {
      request$ = this.chatService.sendMessage(this.chatId, content);
    }

    request$.subscribe({
      next: (msg) => {
        // temp Message durch echte von Server ersetzen
        const index = this.messages.findIndex((m) => m.id === tempId);

        if (index >= 0) {
          // WICHTIG:
          // NIEMALS die Blob-URL behalten.
          // Wenn msg.imageUrl null ist → einfach null setzen.
          this.messages[index] = {
            ...this.messages[index],
            id: msg.id,
            createdAt: msg.createdAt,
            sender: msg.sender,
            content: msg.content,
            imageUrl: msg.imageUrl || null,
          };
        }

        this.loadMessages();

        if (this.photoFile) {
          this.photoFile = null;
          if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
            this.previewUrl = null;
          }
          this.showPhotoContainer = false;
        }

        this.loadMessages();
        setTimeout(() => this.scrollToBottom());
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
    this.previewUrl = null;
    this.photoFile = null;

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
    if (!this.streamActive || !this.videoRef || !this.canvasRef) {
      return;
    }

    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

    // Canvas-Größe an Video anpassen
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Canvas Context fehlt.');
      return;
    }

    // Frame vom Video auf Canvas drawen
    ctx.drawImage(video, 0, 0, width, height);

    // Canvas -> Blob -> File
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Konnte kein Bild aus dem Canvas erzeugen.');
        return;
      }

      // Preview reset
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl);
        this.previewUrl = null;
      }

      const file = new File([blob], `photo-${Date.now()}.png`, {
        type: 'image/png',
      });

      this.photoFile = file;
      this.previewUrl = URL.createObjectURL(file);
      this.showPhotoContainer = true;

      this.stopCamera();
    }, 'image/png');
  }

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((t) => t.stop());
      this.cameraStream = null;
    }

    if (this.videoRef) {
      this.videoRef.nativeElement.srcObject = null;
    }

    this.streamActive = false;
  }

  removePhoto() {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.previewUrl = null;
    this.photoFile = null;
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

        // Nur die Maps-URL als Inhalt
        const link = `https://maps.google.com/?q=${latitude},${longitude}`;

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

  isLocationLink(content: string | null | undefined): boolean {
    if (!content) return false;
    return content.startsWith('https://maps.google.com/?q=');
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
        console.error('Fehler beim Verlassen des Chats', err);

        if (err.status === 400 || err.status === 403) {
          const really = confirm(
            'Du bist der Ersteller dieses Chats und kannst ihn nicht einfach verlassen. Willst du den Chat löschen?'
          );
          if (really) {
            this.deleteChat(true);
          }
        } else {
          alert('Chat konnte nicht verlassen werden.');
        }

        this.loading = false;
      },
    });
  }

  deleteChat(skipConfirm = false) {
    if (!this.chatId) {
      return;
    }

    if (!skipConfirm) {
      const really = confirm('Chat wirklich löschen?');
      if (!really) return;
    }

    this.loading = true;

    this.chatService.deleteChat(this.chatId).subscribe({
      next: () => {
        this.router.navigate(['/chat-feed']);
      },
      error: (err) => {
        console.error('Fehler beim Löschen des Chats', err);
        alert('Chat konnte nicht gelöscht werden');
        this.loading = false;
      },
    });
  }
}
