import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
 providedIn: 'root',
})
export class ApiService {
 private baseUrl = 'http://localhost:3000/api';

 constructor(private http: HttpClient) {}

 private getHeaders(): HttpHeaders {
 const token = localStorage.getItem('token');
 return new HttpHeaders({
 'Content-Type': 'application/json',
 'x-access-token': token || '',
 });
 }

 get(endpoint: string): Observable<any> {
 return this.http.get(`${this.baseUrl}/${endpoint}`, { headers: this.getHeaders() });
 }

 post(endpoint: string, data: any): Observable<any> {
 return this.http.post(`${this.baseUrl}/${endpoint}`, data, { headers: this.getHeaders() });
 }

 put(endpoint: string, data: any): Observable<any> {
 return this.http.put(`${this.baseUrl}/${endpoint}`, data, { headers: this.getHeaders() });
 }

 patch(endpoint: string, data: any): Observable<any> {
 return this.http.patch(`${this.baseUrl}/${endpoint}`, data, { headers: this.getHeaders() });
 }

 patchFile(endpoint: string, data: FormData): Observable<any> {
 const token = localStorage.getItem('token');
 const headers = new HttpHeaders({
 'x-access-token': token || '',
 });
 return this.http.patch(`${this.baseUrl}/${endpoint}`, data, { headers });
 }

 delete(endpoint: string): Observable<any> {
 return this.http.delete(`${this.baseUrl}/${endpoint}`, { headers: this.getHeaders() });
 }

 getBaseUrl(): string {
 return this.baseUrl + '/';
 }
}
