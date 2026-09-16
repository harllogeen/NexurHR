import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
 providedIn: 'root',
})
export class TaskService {
 constructor(private api: ApiService) {}

 createTask(task: any) {
 return this.api.post('tasks', task);
 }

 getMyTasks() {
 return this.api.get('tasks/my');
 }

 getAssignedTasks() {
 return this.api.get('tasks/assigned');
 }

 getAllTasks() {
 return this.api.get('tasks/all');
 }

 getTaskById(id: string) {
 return this.api.get(`tasks/${id}`);
 }

 updateTask(id: string, updates: any) {
 return this.api.put(`tasks/${id}`, updates);
 }

 updateProgress(id: string, data: any) {
 return this.api.patch(`tasks/${id}/progress`, data);
 }

 updateStatus(id: string, status: string) {
 return this.api.patch(`tasks/${id}/status`, { status });
 }

 addComment(id: string, message: string) {
 return this.api.post(`tasks/${id}/comments`, { message });
 }

 deleteTask(id: string) {
 return this.api.delete(`tasks/${id}`);
 }
}
