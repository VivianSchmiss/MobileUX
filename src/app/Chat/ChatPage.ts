import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ChatService, Message, Profile } from '../services/chat.service';
import { CacheService } from '../services/cache.service';
import { FormsModule } from '@angular/forms';
import { Observable, interval, Subject, switchMap, takeUntil, EMPTY } from 'rxjs';
import { HeaderService } from '../services/header.service';
import { OnDestroy } from '@angular/core';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './ChatPage.html',
  styleUrls: ['./ChatPage.css'],
})
export class Chat implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('bottomAnchor') bottomAnchor!: ElementRef<HTMLDivElement>;

  messages: Message[] = [];
  chatId!: string;
  chatName = '';
  newMessage = '';
  currentUser = sessionStorage.getItem('userid') ?? '';

  private destroy$ = new Subject<void>();
  private lastFromId = 0;

  loading = true;

  isOwner = false; //
  private viewInitialized = false;
  showPhotoContainer = false;
  streamActive = false;
  locationLoading = false;
  showAttachmentMenu = false;

  private cameraStream: MediaStream | null = null;
  photoFile: File | null = null;
  previewUrl: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private router: Router,
    private cache: CacheService,
    private headerService: HeaderService,
  ) {}

  async ngOnInit() {
    this.chatId = this.route.snapshot.paramMap.get('id') ?? '';

    this.applyChatName(this.route.snapshot.queryParamMap.get('name') ?? this.chatName ?? '');

    // chat in cache suchen (off)
    try {
      const cachedChats = await this.cache.getChats();
      const cachedChat = cachedChats.find((c) => c.id === this.chatId);

      if (cachedChat) {
        this.applyChatName(cachedChat.name ?? this.chatName);
        this.isOwner = (cachedChat.role ?? '').trim().toLowerCase() === 'owner';
      }
    } catch {}

    if (!navigator.onLine) {
      this.loading = false;
      return;
    }

    // online
    this.chatService.getChats().subscribe({
      next: (chats) => {
        const found = (chats ?? []).find((c) => c.id === this.chatId);

        // wenn nicht in server
        if (!found) {
          this.router.navigate(['/chat-feed']);
          return;
        }

        this.applyChatName(found.name ?? this.chatName);
        this.isOwner = (found.role ?? '').trim().toLowerCase() === 'owner';

        // cache update
        this.cache.setChats(chats ?? []);
      },
      error: () => {},
    });
  }

  ngAfterViewInit() {
    this.viewInitialized = true;
    /*this.loadMessages();*/
    this.loadCachedThenRefresh();
    this.startPolling();
  }

  toggleAttachmentMenu() {
    this.showAttachmentMenu = !this.showAttachmentMenu;
  }

  onMessageImageLoaded() {
    this.scrollToBottom();
  }

  private afterChatLoaded() {
    this.headerService.setTitle(this.chatName || 'Chat');
  }

  private applyChatName(name: string) {
    this.chatName = name ?? '';
    this.headerService.setTitle(this.chatName || 'Chat');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.headerService.clearTitle();
  }

  private async loadCachedThenRefresh() {
    this.loading = true;

    // zuerst cache anzeigen
    const cached = await this.cache.getMessages(this.chatId);
    if (cached.length) {
      this.messages = cached;
      this.loading = false;
      setTimeout(() => this.scrollToBottom());
    }

    // für polling
    this.lastFromId = await this.cache.getLastFromId(this.chatId);

    this.chatService.getMessages(this.chatId, 0).subscribe({
      next: async (msgs) => {
        this.messages = (msgs ?? [])
          .slice()
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        this.loading = false;

        // cache updaten + lastFromId speichern
        await this.cache.setMessages(this.chatId, this.messages);

        // lastFromId neu holen
        this.lastFromId = await this.cache.getLastFromId(this.chatId);

        setTimeout(() => this.scrollToBottom());
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private startPolling() {
    interval(5000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          // offline => kein Request
          if (!navigator.onLine) return EMPTY;

          return this.chatService.getMessages(this.chatId, this.lastFromId);
        }),
      )
      .subscribe({
        next: async (newMsgs) => {
          if (!newMsgs?.length) return;

          // ✅ Dedupe: nur wirklich neue IDs
          const existingIds = new Set(this.messages.map((m) => m.id));
          const onlyNew = newMsgs.filter((m) => !existingIds.has(m.id));
          if (!onlyNew.length) return;

          this.messages = [...this.messages, ...onlyNew].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );

          const max = Math.max(...this.messages.map((m) => Number(m.id) || 0));
          this.lastFromId = Number.isFinite(max) ? max : this.lastFromId;

          await this.cache.appendMessages(this.chatId, onlyNew);
          this.scrollToBottom();
        },
      });
  }

  loadMessages() {
    this.loading = true;
    this.chatService.getMessages(this.chatId, 0).subscribe({
      next: (msgs) => {
        this.messages = msgs
          .slice()
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

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
      imageUrl: this.photoFile ? (this.previewUrl ?? null) : null,
      createdAt: new Date().toISOString(),
    };

    // Sofort lokal anzeigen (Text, Foto)
    this.messages.push(tempMessage);
    this.newMessage = '';
    setTimeout(() => this.scrollToBottom());

    // Entscheidung was an Server geht => sendImage: Text & Foto; sendMessage: Text
    //let request$: Observable<Message>;
    let request$: Observable<any>;

    if (this.photoFile) {
      request$ = this.chatService.sendImage(this.chatId, this.photoFile, content || undefined);
    } else {
      request$ = this.chatService.sendMessage(this.chatId, content);
    }

    console.log('[sendMessage] sending...', {
      chatId: this.chatId,
      hasPhoto: !!this.photoFile,
      content: content,
    });

    request$.subscribe({
      next: () => {
        // ✅ Nach Erfolg: echte Messages vom Server holen (seit lastFromId)
        this.chatService.getMessages(this.chatId, this.lastFromId).subscribe({
          next: async (fresh) => {
            if (!fresh || fresh.length === 0) return;

            // temp entfernen, sobald echte eigene Message da ist (match by content)
            for (const serverMsg of fresh) {
              if (!this.isMine(serverMsg)) continue;

              const tempIndex = this.messages.findIndex(
                (m) =>
                  m.id.startsWith('temp-') &&
                  this.isMine(m) &&
                  (m.content ?? '') === (serverMsg.content ?? ''),
              );

              if (tempIndex >= 0) {
                this.messages.splice(tempIndex, 1);
              }
            }

            // dedupe per ID
            const existingIds = new Set(this.messages.map((m) => m.id));
            const onlyNew = fresh.filter((m) => !existingIds.has(m.id));
            if (onlyNew.length === 0) return;

            this.messages = [...this.messages, ...onlyNew].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );

            // lastFromId nur aus echten numeric IDs
            const numericIds = this.messages
              .map((m) => Number(m.id))
              .filter((n) => Number.isFinite(n));
            this.lastFromId = numericIds.length ? Math.max(...numericIds) : this.lastFromId;

            await this.cache.setMessages(this.chatId, this.messages);
            this.scrollToBottom();
          },
          error: () => {},
        });

        // Foto UI cleanup
        if (this.photoFile) {
          this.photoFile = null;
          if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
            this.previewUrl = null;
          }
          this.showPhotoContainer = false;
        }
      },
      error: (err) => {
        console.error('Error sending message', err);
        alert('Senden fehlgeschlagen (siehe Console).');
      },
    });
  }

  private scrollToBottom() {
    if (!this.viewInitialized || !this.messagesContainer) return;

    requestAnimationFrame(() => {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    });
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
      },
    );
  }

  isLocationLink(content: string | null | undefined): boolean {
    if (!content) return false;
    return content.includes('maps.google.com/?q=');
  }

  private parseLatLonFromMapsUrl(url: string): { lat: number; lon: number } | null {
    try {
      const u = new URL(url);
      const q = u.searchParams.get('q');
      if (!q) return null;

      const parts = q.split(',').map((s) => s.trim());
      if (parts.length < 2) return null;

      const lat = Number(parts[0]);
      const lon = Number(parts[1]);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    } catch {
      return null;
    }
  }

  getStaticMapUrl(content: string | null | undefined): string | null {
    if (!content) return null;

    const cleaned = content.trim();
    const coords = this.parseLatLonFromMapsUrl(cleaned);
    if (!coords) return null;

    const { lat, lon } = coords;
    const zoom = 15;
    const width = 420;
    const height = 220;

    // Wikimedia Maps Static (PNG)
    return `https://maps.wikimedia.org/img/osm-intl,${zoom},${lat},${lon},${width}x${height}.png?mark=${lat},${lon},red-pushpin`;
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
            'Du bist der Ersteller dieses Chats und kannst ihn nicht einfach verlassen. Willst du den Chat löschen?',
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

  private toDate(createdAt: string): Date | null {
    if (!createdAt) return null;

    const iso = new Date(createdAt);
    if (!isNaN(iso.getTime())) return iso;

    // API Format: YYYY-MM-DD_HH-MM-SS
    const m = createdAt.match(/^(\d{4})-(\d{2})-(\d{2})[_ ](\d{2})-(\d{2})-(\d{2})$/);
    if (m) {
      const [, y, mo, d, h, mi, s] = m;
      return new Date(+y, +mo - 1, +d, +h, +mi, +s);
    }
    return null;
  }

  formatTime(createdAt: string): string {
    const dt = this.toDate(createdAt);
    if (!dt) return '';
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // 10:31
  }

  private startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  formatDayLabel(createdAt: string): string {
    const dt = this.toDate(createdAt);
    if (!dt) return '';

    const today = this.startOfDay(new Date());
    const day = this.startOfDay(dt);
    const diff = Math.round((day.getTime() - today.getTime()) / 86400000);

    if (diff === 0) return 'Heute';
    if (diff === -1) return 'Gestern';

    return dt.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // eigene Message rechts
  isMine(msg: Message): boolean {
    const sender = (msg.sender ?? '').trim().toLowerCase();

    const meId = (sessionStorage.getItem('userid') ?? '').trim().toLowerCase();

    // häufig sender = userid
    if (meId && sender === meId) return true;

    // häufig sender = nickname (key je nach login unterschiedlich)
    const meNick = (
      sessionStorage.getItem('nickname') ??
      sessionStorage.getItem('usernick') ??
      sessionStorage.getItem('nick') ??
      ''
    )
      .trim()
      .toLowerCase();

    return meNick !== '' && sender === meNick;
  }
}
