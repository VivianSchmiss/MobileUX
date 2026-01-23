import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HeaderService {
  private readonly titleSubject = new BehaviorSubject<string | null>(null);
  readonly title$ = this.titleSubject.asObservable();

  private readonly menuSubject = new BehaviorSubject<boolean>(false);
  readonly showMenu$ = this.menuSubject.asObservable();

  private readonly backSubject = new BehaviorSubject<boolean>(false);
  readonly showBack$ = this.backSubject.asObservable();

  private readonly chatOwnerSubject = new BehaviorSubject<boolean>(false);
  readonly isChatOwner$ = this.chatOwnerSubject.asObservable();

  private readonly chatContextSubject = new BehaviorSubject<boolean>(false);
  readonly isChatContext$ = this.chatContextSubject.asObservable();

  setTitle(title: string) {
    this.titleSubject.next(title);
  }

  clearTitle() {
    this.titleSubject.next(null);
  }

  setShowMenu(show: boolean) {
    this.menuSubject.next(show);
  }

  setShowBack(show: boolean) {
    this.backSubject.next(show);
  }

  setChatOwner(isOwner: boolean) {
    this.chatOwnerSubject.next(!!isOwner);
  }

  setChatContext(inChat: boolean) {
    this.chatContextSubject.next(!!inChat);
  }
}
