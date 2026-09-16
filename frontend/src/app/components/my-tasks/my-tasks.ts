import { AlertService } from '../../services/alert.service';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';

@Component({
 selector: 'app-my-tasks',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './my-tasks.html',
 styleUrl: './my-tasks.css',
})
export class MyTasks implements OnInit {
  private alertService = inject(AlertService);
 user: any;
 tasks: any[] = [];
 loading = false;
 selectedTask: any = null;
 showDetailPanel = false;
 newComment = '';
 filterStatus = '';
 searchQuery = '';

 // Pagination
 currentPage = 1;
 pageSize = 10;

 constructor(
 private taskService: TaskService,
 private authService: AuthService,
 ) {}

 ngOnInit() {
 this.authService.user$.subscribe((u) => {
 this.user = u;
 if (this.user) {
 this.loadTasks();
 }
 });
 }

 loadTasks() {
 this.loading = true;
 this.taskService.getMyTasks().subscribe({
 next: (data: any) => {
 this.tasks = data.reverse();
 this.loading = false;
 },
 error: () => (this.loading = false),
 });
 }

 get filteredTasks(): any[] {
 return this.tasks.filter((t) => {
 const matchStatus = !this.filterStatus || t.status === this.filterStatus;
 const matchSearch =
 !this.searchQuery ||
 t.title.toLowerCase().includes(this.searchQuery.toLowerCase());
 return matchStatus && matchSearch;
 });
 }

 get paginatedTasks(): any[] {
 const start = (this.currentPage - 1) * this.pageSize;
 return this.filteredTasks.slice(start, start + this.pageSize);
 }

 get totalPages(): number {
 return Math.ceil(this.filteredTasks.length / this.pageSize) || 1;
 }

 getPageNumbers(): number[] {
 return Array.from({ length: this.totalPages }, (_, i) => i + 1);
 }

 goToPage(page: number) {
 this.currentPage = Math.max(1, Math.min(page, this.totalPages));
 }

 // Stats
 get totalCount(): number { return this.tasks.length; }
 get pendingCount(): number { return this.tasks.filter((t) => t.status === 'pending').length; }
 get inProgressCount(): number { return this.tasks.filter((t) => t.status === 'in-progress').length; }
 get completedCount(): number { return this.tasks.filter((t) => t.status === 'completed').length; }
 get overdueCount(): number { return this.tasks.filter((t) => t.status === 'overdue').length; }

 // Task detail
 openTaskDetail(task: any) {
 this.selectedTask = { ...task, subtasks: task.subtasks?.map((s: any) => ({ ...s })) || [] };
 this.showDetailPanel = true;
 this.newComment = '';
 }

 closeDetailPanel() {
 this.showDetailPanel = false;
 this.selectedTask = null;
 }

 // Toggle a subtask and save progress
 toggleSubtask(index: number) {
 if (!this.selectedTask) return;
 this.selectedTask.subtasks[index].completed = !this.selectedTask.subtasks[index].completed;
 this.saveProgress();
 }

 saveProgress() {
 if (!this.selectedTask) return;
 this.taskService.updateProgress(this.selectedTask.id, {
 subtasks: this.selectedTask.subtasks,
 }).subscribe({
 next: (updated: any) => {
 this.selectedTask.progress = updated.progress;
 this.loadTasks();
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error updating progress'),
 });
 }

 // Update manual progress
 updateManualProgress(value: number) {
 if (!this.selectedTask) return;
 this.taskService.updateProgress(this.selectedTask.id, {
 progress: value,
 }).subscribe({
 next: (updated: any) => {
 this.selectedTask.progress = updated.progress;
 this.loadTasks();
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error updating progress'),
 });
 }

 // Change status
 updateStatus(status: string) {
 if (!this.selectedTask) return;
 this.taskService.updateStatus(this.selectedTask.id, status).subscribe({
 next: () => {
 this.selectedTask.status = status;
 this.loadTasks();
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error updating status'),
 });
 }

 // Add comment
 submitComment() {
 if (!this.newComment.trim() || !this.selectedTask) return;
 this.taskService.addComment(this.selectedTask.id, this.newComment).subscribe({
 next: (updated: any) => {
 this.selectedTask = {
 ...updated,
 subtasks: updated.subtasks?.map((s: any) => ({ ...s })) || [],
 };
 this.newComment = '';
 this.loadTasks();
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error adding comment'),
 });
 }

 getPriorityClass(priority: string): string {
 switch (priority) {
 case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
 case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
 case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
 case 'low': return 'bg-green-100 text-green-700 border-green-200';
 default: return 'bg-gray-100 text-gray-700 border-gray-200';
 }
 }

 getStatusClass(status: string): string {
 switch (status) {
 case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
 case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
 case 'under-review': return 'bg-purple-100 text-purple-700 border-purple-200';
 case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
 case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
 case 'cancelled': return 'bg-gray-100 text-gray-500 border-gray-200';
 default: return 'bg-gray-100 text-gray-700 border-gray-200';
 }
 }

 getProgressColor(progress: number): string {
 if (progress >= 75) return 'bg-emerald-500';
 if (progress >= 50) return 'bg-blue-500';
 if (progress >= 25) return 'bg-yellow-500';
 return 'bg-red-500';
 }

 formatDate(date: string): string {
 if (!date) return '—';
 return new Date(date).toLocaleDateString('en-US', {
 month: 'short', day: 'numeric', year: 'numeric',
 });
 }

 formatTime(date: string): string {
 if (!date) return '';
 return new Date(date).toLocaleTimeString('en-US', {
 hour: '2-digit', minute: '2-digit',
 });
 }
}
