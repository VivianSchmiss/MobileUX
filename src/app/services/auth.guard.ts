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
export class AuthGuard implements CanActivate, CanMatch {
  constructor(private auth: AuthService, private router: Router) {}

  private checkAuth(): boolean | UrlTree {
    // aus auth.service
    if (this.auth.isLoggedIn()) {
      return true;
    }
    return this.router.createUrlTree(['/login']);
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.checkAuth();
  }

  canMatch(route: Route, segments: UrlSegment[]): boolean | UrlTree {
    return this.checkAuth();
  }
}
