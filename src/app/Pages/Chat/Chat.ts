import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ChatService, Message } from '../../services/chat.service';
import { CacheService } from '../../services/cache.service';
import { FormsModule } from '@angular/forms';
import { Observable, interval, Subject, switchMap, takeUntil, EMPTY } from 'rxjs';
import { HeaderService } from '../../services/header.service';
import { NgZone } from '@angular/core';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './Chat.html',
  styleUrls: ['./Chat.css'],
})
export class Chat implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('bottomAnchor') bottomAnchor!: ElementRef<HTMLDivElement>;

  messages: Message[] = [];
  chatId!: string;
  chatName = '';
  newMessage = '';
  currentUser = (sessionStorage.getItem('userid') ??
    sessionStorage.getItem('userId') ??
    sessionStorage.getItem('username') ??
    sessionStorage.getItem('usernick') ??
    '') as string;

  loading = true;
  isOwner = false;
  showPhotoContainer = false;
  cameraModalOpen = false;
  streamActive = false;
  locationLoading = false;
  showHeaderMenu = false;
  confirmDeleteOpen = false;
  confirmDeleteLoading = false;

  private viewInitialized = false;

  private lastFromId = 0;
  private destroy$ = new Subject<void>();
  private cameraStream: MediaStream | null = null;

  photoFile: File | null = null;
  previewUrl: string | null = null;

  toggleHeaderMenu() {
    this.showHeaderMenu = !this.showHeaderMenu;
  }

  closeHeaderMenu() {
    this.showHeaderMenu = false;
  }

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private router: Router,
    private cache: CacheService,
    private headerService: HeaderService,
    private zone: NgZone,
  ) {}

  async ngOnInit() {
    this.headerService.setChatContext(true);
    this.headerService.setShowMenu(true);

    this.chatId = this.route.snapshot.paramMap.get('id') ?? '';
    this.applyChatName(this.route.snapshot.queryParamMap.get('name') ?? this.chatName ?? '');

    try {
      const cachedChats = await this.cache.getChats();
      const cachedChat = cachedChats.find((c) => c.id === this.chatId);

      if (cachedChat) {
        this.applyChatName(cachedChat.name ?? this.chatName);
        this.isOwner = (cachedChat.role ?? '').trim().toLowerCase() === 'owner';
        this.headerService.setChatOwner(this.isOwner);
      }
    } catch {}

    if (!navigator.onLine) {
      this.loading = false;
      return;
    }

    this.chatService.getChats().subscribe({
      next: (chats) => {
        const found = (chats ?? []).find((c) => c.id === this.chatId);

        if (!found) {
          this.router.navigate(['/chat-feed']);
          return;
        }

        this.applyChatName(found.name ?? this.chatName);
        this.isOwner = (found.role ?? '').trim().toLowerCase() === 'owner';
        this.headerService.setChatOwner(this.isOwner);
        this.cache.setChats(chats ?? []);
      },
      error: () => {},
    });
  }

  ngAfterViewInit() {
    window.addEventListener('header-action', this.onHeaderAction as EventListener);

    this.viewInitialized = true;

    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    this.loadCachedThenRefresh();
    this.startPolling();

    this.headerService.setShowMenu(true);

    window.addEventListener('chat-footer-send', this.onFooterSend as EventListener);
    window.addEventListener('chat-footer-camera', this.onFooterCamera as EventListener);
    window.addEventListener('chat-footer-location', this.onFooterLocation as EventListener);
    window.addEventListener('chat-footer-file', this.onFooterFile as EventListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('header-action', this.onHeaderAction as EventListener);

    this.destroy$.next();
    this.destroy$.complete();

    this.headerService.setChatContext(false);
    this.headerService.setChatOwner(false);

    this.headerService.clearTitle();
    this.headerService.setShowMenu(false);

    this.stopCamera();

    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }

    window.removeEventListener('chat-footer-send', this.onFooterSend as EventListener);
    window.removeEventListener('chat-footer-camera', this.onFooterCamera as EventListener);
    window.removeEventListener('chat-footer-location', this.onFooterLocation as EventListener);
    window.removeEventListener('chat-footer-file', this.onFooterFile as EventListener);
  }

  private onFooterSend = (ev: Event) => {
    const e = ev as CustomEvent<string>;
    if (!this.chatId) return;
    this.newMessage = (e.detail ?? '').toString();
    this.sendMessage();
  };

  private onFooterCamera = () => {
    this.openCameraModal();
  };

  private onFooterLocation = () => {
    this.shareCurrentLocation();
  };

  private onFooterFile = (ev: Event) => {
    const e = ev as CustomEvent<File>;
    const file = e.detail;
    if (file) this.onFooterFileSelected(file);
  };

  private applyChatName(name: string) {
    this.chatName = name ?? '';
    this.headerService.setTitle(this.chatName || 'Chat');
  }

  private onHeaderAction = (ev: Event) => {
    const e = ev as CustomEvent<'leave' | 'delete'>;
    if (!e?.detail) return;

    if (e.detail === 'leave') {
      this.leaveChat();
      return;
    }

    if (e.detail === 'delete') {
      if (!this.isOwner) {
        alert('Nur der Ersteller des Chats kann ihn auch löschen.');
        return;
      }
      this.deleteChat();
    }
  };

  openCameraModal() {
    this.cameraModalOpen = true;
    this.openCamera();
  }

  closeCameraModal() {
    this.cameraModalOpen = false;
    this.stopCamera();
  }

  onMessageImageLoaded() {
    this.scrollToBottomStable();
  }

  private async loadCachedThenRefresh() {
    this.loading = true;

    const cached = await this.cache.getMessages(this.chatId);
    if (cached.length) {
      this.messages = cached;
      this.loading = false;
      setTimeout(() => this.scrollToBottomStable());
    }

    this.lastFromId = await this.cache.getLastFromId(this.chatId);

    this.chatService.getMessages(this.chatId, 0).subscribe({
      next: async (msgs) => {
        this.messages = (msgs ?? [])
          .slice()
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        this.loading = false;

        await this.cache.setMessages(this.chatId, this.messages);

        this.lastFromId = await this.cache.getLastFromId(this.chatId);

        setTimeout(() => this.scrollToBottomStable());
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
          if (!navigator.onLine) return EMPTY;
          return this.chatService.getMessages(this.chatId, this.lastFromId);
        }),
      )
      .subscribe({
        next: async (newMsgs) => {
          if (!newMsgs?.length) return;

          const existingIds = new Set(this.messages.map((m) => m.id));
          const onlyNew = newMsgs.filter((m) => !existingIds.has(m.id));
          if (!onlyNew.length) return;

          this.messages = [...this.messages, ...onlyNew].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );

          const max = Math.max(...this.messages.map((m) => Number(m.id) || 0));
          this.lastFromId = Number.isFinite(max) ? max : this.lastFromId;

          await this.cache.appendMessages(this.chatId, onlyNew);
          this.scrollToBottomStable();
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
        setTimeout(() => this.scrollToBottomStable());
      },
      error: (err) => {
        console.error('Error loading messages', err);
        this.loading = false;
        alert('Nachrichten konnten nicht geladen werden.');
      },
    });
  }

  onFooterFileSelected(file: File) {
    if (file.type !== 'image/png') {
      alert('Nur PNG-Bilder sind erlaubt.');
      return;
    }

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

    this.messages.push(tempMessage);
    this.newMessage = '';
    this.scrollToBottomStable();

    let request$: Observable<any>;

    if (this.photoFile) {
      request$ = this.chatService.sendImage(this.chatId, this.photoFile, content || undefined);
    } else {
      request$ = this.chatService.sendMessage(this.chatId, content);
    }

    console.log('sendMessage sending...', {
      chatId: this.chatId,
      hasPhoto: !!this.photoFile,
      content: content,
    });

    request$.subscribe({
      next: (res) => {
        if (res?.status && String(res.status).toLowerCase() !== 'ok') {
          console.error('postmessage returned non-ok:', res);
          alert('Senden fehlgeschlagen: ' + (res.message ?? 'Unbekannter Fehler'));
          const idx = this.messages.findIndex((m) => m.id === tempId);
          if (idx >= 0) this.messages.splice(idx, 1);

          return;
        }

        const from = Math.max(0, this.lastFromId - 1);

        this.chatService.getMessages(this.chatId, from).subscribe({
          next: async (fresh) => {
            if (!fresh || fresh.length === 0) return;

            const tempIndex = this.messages.findIndex(
              (m) => m.id.startsWith('temp-') && this.isMine(m) && (m.content ?? '') === content,
            );
            if (tempIndex >= 0) this.messages.splice(tempIndex, 1);

            const existingIds = new Set(this.messages.map((m) => m.id));
            const onlyNew = fresh.filter((m) => !existingIds.has(m.id));
            if (onlyNew.length === 0) return;

            this.messages = [...this.messages, ...onlyNew].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            );

            const numericIds = this.messages
              .map((m) => Number(m.id))
              .filter((n) => Number.isFinite(n));
            this.lastFromId = numericIds.length ? Math.max(...numericIds) : this.lastFromId;

            await this.cache.setMessages(this.chatId, this.messages);
            this.scrollToBottomStable();
          },
          error: () => {},
        });

        if (this.photoFile) {
          this.photoFile = null;
          if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
            this.previewUrl = null;
          }
          this.showPhotoContainer = false;

          if (this.cameraModalOpen) {
            this.closeCameraModal();
          }
        }
      },
      error: (err) => {
        console.error('Error sending message', err);
        alert('Nachricht senden fehlgeschlagen.');
      },
    });
  }

  private scrollToBottomStable() {
    this.zone.onStable.pipe(take(1)).subscribe(() => {
      if (!this.bottomAnchor) return;

      this.bottomAnchor.nativeElement.scrollIntoView({
        behavior: 'auto',
        block: 'end',
      });
    });
  }

  async openCamera() {
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

      try {
        await this.videoRef.nativeElement.play();
      } catch {}
    } catch (err) {
      alert('Kamera konnte nicht geöffnet werden.');
      console.error(err);
    }
  }

  takePhoto() {
    if (!this.streamActive || !this.videoRef || !this.canvasRef) return;

    const video = this.videoRef.nativeElement;
    const canvas = this.canvasRef.nativeElement;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Canvas 2D-Kontext nicht verfügbar.');
      alert('Foto konnte nicht aufgenommen werden.');
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/png');

    if (this.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }

    this.previewUrl = dataUrl;
    this.showPhotoContainer = true;
    this.stopCamera();

    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Konnte kein Bild aus dem Canvas erzeugen.');
        alert('Foto konnte nicht gespeichert werden.');
        return;
      }

      const file = new File([blob], `photo-${Date.now()}.png`, { type: 'image/png' });
      this.photoFile = file;
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
    if (!navigator.geolocation) {
      alert('Geolocation wird von deinem Browser nicht unterstützt.');
      return;
    }

    this.locationLoading = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const link = `https://maps.google.com/?q=${latitude},${longitude}`;

        const tempId = 'temp-' + Date.now();
        const tempMessage: Message = {
          id: tempId,
          chatId: this.chatId,
          sender: this.currentUser,
          content: link,
          imageUrl: null,
          createdAt: new Date().toISOString(),
        };

        this.messages.push(tempMessage);
        setTimeout(() => this.scrollToBottomStable());

        this.chatService.sendMessage(this.chatId, link).subscribe({
          next: () => {
            this.chatService.getMessages(this.chatId, this.lastFromId).subscribe({
              next: async (fresh) => {
                if (!fresh || fresh.length === 0) {
                  this.locationLoading = false;
                  return;
                }

                const tempIndex = this.messages.findIndex(
                  (m) => m.id.startsWith('temp-') && this.isMine(m) && (m.content ?? '') === link,
                );
                if (tempIndex >= 0) {
                  this.messages.splice(tempIndex, 1);
                }

                const existingIds = new Set(this.messages.map((m) => m.id));
                const onlyNew = fresh.filter((m) => !existingIds.has(m.id));
                if (onlyNew.length === 0) {
                  this.locationLoading = false;
                  return;
                }

                this.messages = [...this.messages, ...onlyNew].sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                );

                const numericIds = this.messages
                  .map((m) => Number(m.id))
                  .filter((n) => Number.isFinite(n));
                this.lastFromId = numericIds.length ? Math.max(...numericIds) : this.lastFromId;

                await this.cache.setMessages(this.chatId, this.messages);
                this.scrollToBottomStable();

                this.locationLoading = false;
              },
              error: () => {
                this.locationLoading = false;
              },
            });
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
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

    return `https://maps.wikimedia.org/img/osm-intl,${zoom},${lat},${lon},${width}x${height}.png?mark=${lat},${lon},red-pushpin`;
  }

  leaveChat() {
    if (!this.chatId) return;
    this.loading = true;
    this.chatService.leaveChat(this.chatId).subscribe({
      next: async () => {
        try {
          const chats = await this.cache.getChats();
          await this.cache.setChats((chats ?? []).filter((c) => c.id !== this.chatId));
        } catch {}

        this.router.navigate(['/chat-feed']);
      },
      error: (err) => {
        console.error('leavechat failed', err);
        alert('Chat konnte nicht verlassen werden: ' + (err?.status ?? ''));
        this.loading = false;
      },
    });
  }

  openDeleteConfirm() {
    this.confirmDeleteOpen = true;
  }

  closeDeleteConfirm() {
    this.confirmDeleteOpen = false;
    this.confirmDeleteLoading = false;
  }

  confirmDelete() {
    this.deleteChat(true);
  }

  deleteChat(skipConfirm = false) {
    if (!this.chatId) return;

    if (!skipConfirm) {
      this.openDeleteConfirm();
      return;
    }

    this.confirmDeleteLoading = true;
    this.loading = true;

    this.chatService.deleteChat(this.chatId).subscribe({
      next: () => {
        this.closeDeleteConfirm();
        this.router.navigate(['/chat-feed']);
      },
      error: (err) => {
        console.error('Fehler beim Löschen des Chats', err);
        alert('Chat konnte nicht gelöscht werden.');
        this.loading = false;
        this.confirmDeleteLoading = false;
      },
    });
  }

  private toDate(createdAt: string): Date | null {
    if (!createdAt) return null;

    const iso = new Date(createdAt);
    if (!isNaN(iso.getTime())) return iso;

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
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  isMine(msg: Message): boolean {
    const sender = (msg.sender ?? '').trim().toLowerCase();
    const meId = (sessionStorage.getItem('userid') ?? '').trim().toLowerCase();
    if (meId && sender === meId) return true;

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
