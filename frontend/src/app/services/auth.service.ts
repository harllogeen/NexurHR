import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Router } from '@angular/router';
import { BehaviorSubject, tap } from 'rxjs';

@Injectable({
 providedIn: 'root',
})
export class AuthService {
 private userSubject = new BehaviorSubject<any>(null);
 public user$ = this.userSubject.asObservable();

 constructor(
 private api: ApiService,
 private router: Router,
 ) {
 const user = localStorage.getItem('user');
 if (user) {
 try {
 this.userSubject.next(JSON.parse(user));
 } catch (e) {
 console.error('Failed to parse user from local storage', e);
 localStorage.removeItem('user');
 localStorage.removeItem('token');
 }
 }
 }

 login(credentials: any) {
 return this.api.post('auth/login', credentials).pipe(
 tap((res: any) => {
 if (res.accessToken) {
 localStorage.setItem('token', res.accessToken);
 localStorage.setItem('user', JSON.stringify(res));
 this.userSubject.next(res);
 }
 }),
 );
 }

 register(user: any) {
 return this.api.post('auth/register', user);
 }

 changePassword(data: any) {
 return this.api.post('auth/change-password', data);
 }

 logout() {
 localStorage.removeItem('token');
 localStorage.removeItem('user');
 this.userSubject.next(null);
 this.router.navigate(['/login']);
 }

 get currentUserValue() {
 return this.userSubject.value;
 }
}
