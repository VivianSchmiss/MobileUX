import { Injectable } from '@angular/core';
import {
  CanActivate,
  CanMatch,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Route,
  UrlSegment,
  UrlTree,
} from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  // check ob token existiert
  private checkAuth(): boolean | UrlTree {
    if (this.auth.isLoggedIn()) {
      return true;
    }

    console.error('Zugriff verweigert: Bitte einloggen.');
    return this.router.createUrlTree(['/login']);
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.checkAuth();
  }
}
