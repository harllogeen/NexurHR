import { AlertService } from '../../services/alert.service';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ProjectService } from '../../services/project.service';

@Component({
 selector: 'app-task-management',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './task-management.html',
 styleUrl: './task-management.css',
})
export class TaskManagement implements OnInit {
  private alertService = inject(AlertService);
 user: any;
 assignedTasks: any[] = [];
 allTasks: any[] = [];
 employees: any[] = [];
 projects: any[] = [];
 loading = false;
 activeTab: string = 'assigned';
 showCreateModal = false;
 showEditModal = false;
 selectedTask: any = null;
 showDetailPanel = false;
 filterStatus = '';
 filterPriority = '';
 searchQuery = '';
 newComment = '';

 // Multi-select assign dropdown
 showAssignDropdown = false;
 assignSearchQuery = '';
 selectedAssignees: string[] = [];

 // Edit modal multi-select
 showEditAssignDropdown = false;
 editAssignSearchQuery = '';
 editSelectedAssignees: string[] = [];

 newTask = {
 title: '',
 description: '',
 assignedTo: [] as string[],
 priority: 'medium',
 category: 'General',
 dueDate: '',
 projectId: '',
 projectName: '',
 subtasks: [] as { title: string }[],
 };

 editTask_data = {
 id: '',
 title: '',
 description: '',
 assignedTo: [] as string[],
 priority: 'medium',
 category: 'General',
 dueDate: '',
 projectId: '',
 projectName: '',
 };

 newSubtaskTitle = '';

 // Pagination
 currentPage = 1;
 pageSize = 10;

 constructor(
 private taskService: TaskService,
 private authService: AuthService,
 private api: ApiService,
 private projectService: ProjectService,
 ) {}

 ngOnInit() {
 this.authService.user$.subscribe((u) => {
 this.user = u;
 if (this.user) {
 if (this.user.role !== 'employee') {
 this.loadAssignedTasks();
 }
 this.loadEmployees();
 this.loadProjects();
 if (this.user.role === 'hr' || this.user.role === 'cto') {
 this.loadAllTasks();
 }
 }
 });
 }

 loadAssignedTasks() {
 this.loading = true;
 this.taskService.getAssignedTasks().subscribe({
 next: (data: any) => {
 this.assignedTasks = data.reverse();
 this.loading = false;
 },
 error: () => (this.loading = false),
 });
 }

 loadAllTasks() {
 this.taskService.getAllTasks().subscribe({
 next: (data: any) => {
 this.allTasks = data.reverse();
 },
 error: (err) => console.error(err),
 });
 }

 loadEmployees() {
 this.api.get('employees').subscribe({
 next: (data: any) => {
 if (this.user?.role === 'supervisor') {
 const myEmpRecord = data.find((e: any) => e.email === this.user?.email || String(e.id) === String(this.user?.id));
 
 if (myEmpRecord) {
 const myTitle = (myEmpRecord.designation || myEmpRecord.role || '').toLowerCase();
 const myDept = myEmpRecord.department || '';

 if (myTitle.match(/\bcto\b/) || myTitle.includes('chief technology officer')) {
 this.employees = data;
 return;
 }

 let mySubTeam = '';
 if (myTitle.includes('frontend')) mySubTeam = 'frontend';
 else if (myTitle.includes('backend')) mySubTeam = 'backend';

 this.employees = data.filter((emp: any) => {
 const empTitle = (emp.designation || emp.role || '').toLowerCase();
 let empSubTeam = '';
 if (empTitle.includes('frontend')) empSubTeam = 'frontend';
 else if (empTitle.includes('backend')) empSubTeam = 'backend';
 else if (empTitle.includes('full stack') || empTitle.includes('fullstack')) empSubTeam = 'fullstack';

 if (mySubTeam) {
 if (empSubTeam === 'fullstack') return true;
 return mySubTeam === empSubTeam;
 }
 return emp.department === myDept;
 });
 } else {
 this.employees = [];
 }
 } else if (this.user?.role === 'cto') {
 // CTO can assign to everyone except managers
 this.employees = data.filter((emp: any) => {
 const empRole = (emp.role || '').toLowerCase();
 const empDesignation = (emp.designation || '').toLowerCase();
 return empRole !== 'manager' && !empDesignation.includes('manager');
 });
 } else {
 this.employees = data;
 }
 },
 error: (err) => console.error(err),
 });
 }

 get currentTasks(): any[] {
 const source = this.activeTab === 'all' ? this.allTasks : this.assignedTasks;
 return source.filter((t) => {
 const matchStatus = !this.filterStatus || t.status === this.filterStatus;
 const matchPriority = !this.filterPriority || t.priority === this.filterPriority;
 const matchSearch =
 !this.searchQuery ||
 t.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
 (t.assignedToName || '').toLowerCase().includes(this.searchQuery.toLowerCase());
 return matchStatus && matchPriority && matchSearch;
 });
 }

 get paginatedTasks(): any[] {
 const start = (this.currentPage - 1) * this.pageSize;
 return this.currentTasks.slice(start, start + this.pageSize);
 }

 get totalPages(): number {
 return Math.ceil(this.currentTasks.length / this.pageSize) || 1;
 }

 getPageNumbers(): number[] {
 return Array.from({ length: this.totalPages }, (_, i) => i + 1);
 }

 goToPage(page: number) {
 this.currentPage = Math.max(1, Math.min(page, this.totalPages));
 }

 // Stats
 get totalCount(): number {
 return this.activeTab === 'all' ? this.allTasks.length : this.assignedTasks.length;
 }
 get inProgressCount(): number {
 const source = this.activeTab === 'all' ? this.allTasks : this.assignedTasks;
 return source.filter((t) => t.status === 'in-progress').length;
 }
 get completedCount(): number {
 const source = this.activeTab === 'all' ? this.allTasks : this.assignedTasks;
 return source.filter((t) => t.status === 'completed').length;
 }
 get overdueCount(): number {
 const source = this.activeTab === 'all' ? this.allTasks : this.assignedTasks;
 return source.filter((t) => t.status === 'overdue').length;
 }
 get pendingCount(): number {
 const source = this.activeTab === 'all' ? this.allTasks : this.assignedTasks;
 return source.filter((t) => t.status === 'pending').length;
 }

 // Multi-select helpers for create modal
 get filteredEmployees(): any[] {
 if (!this.assignSearchQuery) return this.employees;
 const q = this.assignSearchQuery.toLowerCase();
 return this.employees.filter((e: any) =>
 `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
 (e.designation || '').toLowerCase().includes(q)
 );
 }

 toggleAssignee(empId: string) {
 const idx = this.selectedAssignees.indexOf(empId);
 if (idx > -1) {
 this.selectedAssignees.splice(idx, 1);
 } else {
 this.selectedAssignees.push(empId);
 }
 this.newTask.assignedTo = [...this.selectedAssignees];
 }

 isAssigneeSelected(empId: string): boolean {
 return this.selectedAssignees.includes(empId);
 }

 getAssigneeNames(): string {
 if (this.selectedAssignees.length === 0) return '';
 return this.selectedAssignees.map(id => {
 const emp = this.employees.find((e: any) => String(e.id) === String(id));
 return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
 }).join(', ');
 }

 // Multi-select helpers for edit modal
 get filteredEditEmployees(): any[] {
 if (!this.editAssignSearchQuery) return this.employees;
 const q = this.editAssignSearchQuery.toLowerCase();
 return this.employees.filter((e: any) =>
 `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
 (e.designation || '').toLowerCase().includes(q)
 );
 }

 toggleEditAssignee(empId: string) {
 const idx = this.editSelectedAssignees.indexOf(empId);
 if (idx > -1) {
 this.editSelectedAssignees.splice(idx, 1);
 } else {
 this.editSelectedAssignees.push(empId);
 }
 this.editTask_data.assignedTo = [...this.editSelectedAssignees];
 }

 isEditAssigneeSelected(empId: string): boolean {
 return this.editSelectedAssignees.includes(empId);
 }

 getEditAssigneeNames(): string {
 if (this.editSelectedAssignees.length === 0) return '';
 return this.editSelectedAssignees.map(id => {
 const emp = this.employees.find((e: any) => String(e.id) === String(id));
 return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
 }).join(', ');
 }

 submitTask() {
 if (!this.newTask.title) {
 this.alertService.showAlert('error', 'Error', 'Please enter a task title');
 return;
 }
 if (this.selectedAssignees.length === 0) {
 this.alertService.showAlert('error', 'Error', 'Please select at least one employee to assign');
 return;
 }
 this.newTask.assignedTo = [...this.selectedAssignees];
 this.loading = true;
 this.taskService.createTask(this.newTask).subscribe({
 next: () => {
 this.loadAssignedTasks();
 if (this.user.role === 'hr' || this.user.role === 'cto') this.loadAllTasks();
 this.showCreateModal = false;
 this.resetNewTask();
 this.loading = false;
 },
 error: (err) => {
 this.alertService.showAlert('error', 'Error', err.error?.message || 'Error creating task');
 this.loading = false;
 },
 });
 }

 // Create task helpers
 addSubtask() {
 if (this.newSubtaskTitle.trim()) {
 this.newTask.subtasks.push({ title: this.newSubtaskTitle.trim() });
 this.newSubtaskTitle = '';
 }
 }

 removeSubtask(index: number) {
 this.newTask.subtasks.splice(index, 1);
 }

 resetNewTask() {
 this.newTask = {
 title: '',
 description: '',
 assignedTo: [],
 priority: 'medium',
 category: 'General',
 dueDate: '',
 projectId: '',
 projectName: '',
 subtasks: [],
 };
 this.newSubtaskTitle = '';
 this.selectedAssignees = [];
 this.assignSearchQuery = '';
 this.showAssignDropdown = false;
 }

 loadProjects() {
 this.projectService.getProjects().subscribe({
 next: (data: any) => this.projects = data,
 error: (err) => console.error(err)
 });
 }

 onProjectChange() {
 const proj = this.projects.find((p: any) => p.id === this.newTask.projectId);
 this.newTask.projectName = proj ? proj.name : '';
 }

 getCompletedSubtasksCount(subtasks: any[]): number {
 if (!subtasks || !Array.isArray(subtasks)) return 0;
 return subtasks.filter(s => s.completed).length;
 }

 // Task detail
 openTaskDetail(task: any) {
 this.selectedTask = { ...task };
 this.showDetailPanel = true;
 this.newComment = '';
 }

 closeDetailPanel() {
 this.showDetailPanel = false;
 this.selectedTask = null;
 }

 updateTaskStatus(taskId: string, status: string) {
 this.taskService.updateStatus(taskId, status).subscribe({
 next: () => {
 this.loadAssignedTasks();
 if (this.user.role === 'hr' || this.user.role === 'cto') this.loadAllTasks();
 if (this.selectedTask && this.selectedTask.id === taskId) {
 this.selectedTask.status = status;
 }
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error updating status'),
 });
 }

 submitComment() {
 if (!this.newComment.trim() || !this.selectedTask) return;
 this.taskService.addComment(this.selectedTask.id, this.newComment).subscribe({
 next: (updated: any) => {
 this.selectedTask = updated;
 this.newComment = '';
 this.loadAssignedTasks();
 if (this.user.role === 'hr' || this.user.role === 'cto') this.loadAllTasks();
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error adding comment'),
 });
 }

 // Edit Task
 openEditModal(task: any) {
 // Map assignedTo user IDs back to employee IDs for the dropdown
 const assignedToArr = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
 const empIds = assignedToArr.map((userId: string) => {
 const emp = this.employees.find((e: any) => {
 // employeeId stored on user, but we have employee records
 // Check by name match or direct ID
 return String(e.id) === String(userId) || String(e.userId) === String(userId);
 });
 return emp ? String(emp.id) : String(userId);
 });

 this.editTask_data = {
 id: task.id,
 title: task.title,
 description: task.description || '',
 assignedTo: empIds,
 priority: task.priority,
 category: task.category || 'General',
 dueDate: task.dueDate || '',
 projectId: task.projectId || '',
 projectName: task.projectName || '',
 };
 this.editSelectedAssignees = [...empIds];
 this.editAssignSearchQuery = '';
 this.showEditAssignDropdown = false;
 this.showEditModal = true;
 this.showDetailPanel = false;
 }

 onEditProjectChange() {
 const proj = this.projects.find((p: any) => p.id === this.editTask_data.projectId);
 this.editTask_data.projectName = proj ? proj.name : '';
 }

 submitEditTask() {
 if (!this.editTask_data.title) {
 this.alertService.showAlert('error', 'Error', 'Please enter a task title');
 return;
 }
 if (this.editSelectedAssignees.length === 0) {
 this.alertService.showAlert('error', 'Error', 'Please select at least one employee to assign');
 return;
 }
 this.editTask_data.assignedTo = [...this.editSelectedAssignees];
 this.loading = true;
 this.taskService.updateTask(this.editTask_data.id, this.editTask_data).subscribe({
 next: () => {
 this.loadAssignedTasks();
 if (this.user.role === 'hr' || this.user.role === 'cto') this.loadAllTasks();
 this.showEditModal = false;
 this.loading = false;
 },
 error: (err) => {
 this.alertService.showAlert('error', 'Error', err.error?.message || 'Error updating task');
 this.loading = false;
 },
 });
 }

 deleteTask(taskId: string) {
 if (!confirm('Are you sure you want to delete this task?')) return;
 this.taskService.deleteTask(taskId).subscribe({
 next: () => {
 this.loadAssignedTasks();
 if (this.user.role === 'hr' || this.user.role === 'cto') this.loadAllTasks();
 this.closeDetailPanel();
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error deleting task'),
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
 month: 'short',
 day: 'numeric',
 year: 'numeric',
 });
 }

 formatTime(date: string): string {
 if (!date) return '';
 return new Date(date).toLocaleTimeString('en-US', {
 hour: '2-digit',
 minute: '2-digit',
 });
 }
}
