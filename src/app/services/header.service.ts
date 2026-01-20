import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HeaderService {
  private readonly titleSubject = new BehaviorSubject<string | null>(null);
  readonly title$ = this.titleSubject.asObservable();

  // header nicht auf allen zeigen
  private readonly menuSubject = new BehaviorSubject<boolean>(false);
  readonly showMenu$ = this.menuSubject.asObservable();

  setTitle(title: string) {
    this.titleSubject.next(title);
  }

  clearTitle() {
    this.titleSubject.next(null);
  }

  setShowMenu(show: boolean) {
    this.menuSubject.next(show);
  }
}
