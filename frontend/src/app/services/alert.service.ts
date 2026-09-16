import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Alert {
 type: 'success' | 'error' | 'warning' | 'info';
 title: string;
 message: string;
}

@Injectable({
 providedIn: 'root'
})
export class AlertService {
 private alertSubject = new Subject<Alert | null>();
 alert$ = this.alertSubject.asObservable();

 showAlert(type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) {
 this.alertSubject.next({ type, title, message });
 }

 clear() {
 this.alertSubject.next(null);
 }
}
