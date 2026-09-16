import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
 providedIn: 'root',
})
export class NotificationService {
 private notificationsSubject = new BehaviorSubject<any[]>([]);
 notifications$ = this.notificationsSubject.asObservable();

 constructor(private api: ApiService) {}

 loadMyNotifications() {
 this.api.get('notifications').subscribe({
 next: (data: any) => this.notificationsSubject.next(data.reverse()),
 error: (err) => console.error('Error loading notifications', err),
 });
 }

 markAsRead(id: string) {
 return this.api.patch(`notifications/${id}/read`, {});
 }

 getUnreadCount() {
 return this.notificationsSubject.value.filter((n) => !n.read).length;
 }
}
