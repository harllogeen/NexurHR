import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
 providedIn: 'root'
})
export class LoaderService {
 private isLoadingSubject = new BehaviorSubject<boolean>(false);
 isLoading$ = this.isLoadingSubject.asObservable();
 private requestCount = 0;

 show() {
 this.requestCount++;
 this.isLoadingSubject.next(true);
 }

 hide() {
 this.requestCount--;
 if (this.requestCount <= 0) {
 this.requestCount = 0;
 this.isLoadingSubject.next(false);
 }
 }
}
