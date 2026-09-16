import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { TaskService } from '../../services/task.service';
import { ActivatedRoute } from '@angular/router';
// Import Reusable Components
import { FormInputComponent } from '../shared/form-input/form-input.component';
import { FormSelectComponent } from '../shared/form-select/form-select.component';
import { FormTextareaComponent } from '../shared/form-textarea/form-textarea.component';
import { ButtonComponent } from '../shared/button/button.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';

@Component({
 selector: 'app-projects',
 standalone: true,
 imports: [
   CommonModule, 
   FormsModule,
   FormInputComponent,
   FormSelectComponent,
   FormTextareaComponent,
   ButtonComponent,
   StatusBadgeComponent
 ],
 templateUrl: './projects.html',
 styleUrls: ['./projects.css']
})
export class ProjectsComponent implements OnInit {
 projects: any[] = [];
 tasks: any[] = [];
 employees: any[] = [];
 departments: any[] = [];
 user: any;
 loading = true;
 currentView: string = 'my';

 // Dropdown States
 showDeptDropdown = false;
 showMemberDropdown = false;

 // UI States
 showModal = false;
 editingProject: any = null;

 // New Project Form
 newProject = {
 name: '',
 description: '',
 status: 'Planning',
 startDate: '',
 endDate: '',
 department: [] as string[],
 members: [] as string[]
 };

 // Select options for reusable components
 get statusOptions() {
   return [
     { value: 'Planning', label: 'Planning' },
     { value: 'Active', label: 'Active' },
     { value: 'On-Hold', label: 'On-Hold' },
     { value: 'Completed', label: 'Completed' }
   ];
 }

 // View Details
 selectedProject: any = null;
 showDetailSlideOver = false;

 constructor(
 private projectService: ProjectService,
 private api: ApiService,
 private authService: AuthService,
 private taskService: TaskService,
 private route: ActivatedRoute
 ) {
 this.authService.user$.subscribe(u => this.user = u);
 }

 ngOnInit() {
 this.route.queryParams.subscribe(params => {
 this.currentView = params['view'] || 'my';
 this.loadData();
 });
 }

 loadData() {
 this.loading = true;
 
 // Load Employees
 this.api.get('employees').subscribe({
 next: (data: any) => this.employees = data,
 error: err => console.error(err)
 });

 // Load Departments
 this.api.get('departments').subscribe({
 next: (data: any) => this.departments = data,
 error: err => console.error(err)
 });

 // Load Tasks (for progress calculation) - only if not employee, otherwise projects API returns progress directly
 if (this.user?.role !== 'employee') {
 this.taskService.getAllTasks().subscribe({
 next: (data: any) => this.tasks = data,
 error: err => console.error(err)
 });
 }

 // Load Projects
 this.projectService.getProjects(this.currentView).subscribe({
 next: (data: any) => {
 this.projects = data.reverse();
 this.loading = false;
 },
 error: () => this.loading = false
 });
 }

 openCreateModal() {
 this.editingProject = null;
 this.showDeptDropdown = false;
 this.showMemberDropdown = false;
 this.newProject = {
 name: '',
 description: '',
 status: 'Planning',
 startDate: '',
 endDate: '',
 department: [],
 members: []
 };
 this.showModal = true;
 }

 closeModal() {
 this.showModal = false;
 }

 toggleMember(empId: string) {
 const idx = this.newProject.members.indexOf(empId);
 if (idx > -1) {
 this.newProject.members.splice(idx, 1);
 } else {
 this.newProject.members.push(empId);
 }
 }

 hasMember(empId: string): boolean {
 return this.newProject.members.includes(empId);
 }

 toggleDepartment(deptName: string) {
 const idx = this.newProject.department.indexOf(deptName);
 if (idx > -1) {
 this.newProject.department.splice(idx, 1);
 } else {
 this.newProject.department.push(deptName);
 }
 }

 hasDepartment(deptName: string): boolean {
 return this.newProject.department.includes(deptName);
 }

 get selectedDepartmentsText(): string {
 const len = this.newProject.department.length;
 if (len === 0) return 'Select Departments';
 if (len === 1) return this.newProject.department[0];
 if (len <= 3) return this.newProject.department.join(', ');
 return `${len} Departments Selected`;
 }

 get selectedMembersText(): string {
 const len = this.newProject.members.length;
 if (len === 0) return 'Select Team Members';
 if (len === 1) return this.getEmployeeName(this.newProject.members[0]);
 return `${len} Members Selected`;
 }

 saveProject() {
 if (!this.newProject.name) return;

 if (this.editingProject) {
 this.projectService.updateProject(this.editingProject.id, this.newProject).subscribe({
 next: () => {
 this.loadData();
 this.closeModal();
 },
 error: err => console.error(err)
 });
 } else {
 this.projectService.createProject(this.newProject).subscribe({
 next: () => {
 this.loadData();
 this.closeModal();
 },
 error: err => console.error(err)
 });
 }
 }

 deleteProject(id: string) {
 if (confirm('Are you sure you want to delete this project?')) {
 this.projectService.deleteProject(id).subscribe({
 next: () => this.loadData(),
 error: err => console.error(err)
 });
 }
 }

 openDetails(project: any) {
 this.selectedProject = project;
 this.showDetailSlideOver = true;
 }

 closeDetails() {
 this.showDetailSlideOver = false;
 this.selectedProject = null;
 }

 // Helpers
 getProjectTasks(projectId: string) {
 return this.tasks.filter(t => t.projectId === projectId);
 }

 getProjectProgress(projectId: string): number {
 const projectTasks = this.getProjectTasks(projectId);
 if (!projectTasks.length) return 0;
 
 let totalProgress = 0;
 projectTasks.forEach(t => {
 totalProgress += (t.progress || 0);
 });
 
 return Math.round(totalProgress / projectTasks.length);
 }

 getEmployeeName(id: string): string {
 const emp = this.employees.find(e => String(e.id) === String(id) || String(e.userId) === String(id));
 return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
 }

 canCreateProject(): boolean {
 return ['hr', 'manager', 'cto'].includes(this.user?.role);
 }
}
