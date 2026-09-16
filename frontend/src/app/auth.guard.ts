import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Injectable({
 providedIn: 'root'
})
export class AuthGuard implements CanActivate {
 constructor(private auth: AuthService, private router: Router) {}

 canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
 const user = this.auth.currentUserValue;
 if (user) {
 // check if route is restricted by role
 if (route.data['roles'] && route.data['roles'].indexOf(user.role) === -1) {
 // role not authorised so redirect to home page
 this.router.navigate(['/']);
 return false;
 }

 // authorised so return true
 return true;
 }

 // not logged in so redirect to login page with the return url
 this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
 return false;
 }
}
