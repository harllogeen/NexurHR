import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoaderService } from '../../services/loader.service';
import { AlertService } from '../../services/alert.service';

// Import Reusable Components
import { FormInputComponent } from '../shared/form-input/form-input.component';
import { FormSelectComponent } from '../shared/form-select/form-select.component';
import { ButtonComponent } from '../shared/button/button.component';
import { StatusBadgeComponent } from '../shared/status-badge/status-badge.component';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';

@Component({
 selector: 'app-employees',
 standalone: true,
 imports: [
   CommonModule, 
   FormsModule,
   FormInputComponent,
   FormSelectComponent,
   ButtonComponent,
   StatusBadgeComponent,
   ConfirmationModalComponent
 ],
 templateUrl: './employees.html',
 styleUrl: './employees.css',
})
export class Employees implements OnInit {
 currentView: string = 'all';
 employees: any[] = [];
 departments: any[] = [];
 designations: any[] = [];

 get reportingToOptions(): any[] {
 if (!this.newEmployee.department) return [];
 return this.employees.filter(e => 
 e.department === this.newEmployee.department && 
 e.id !== this.newEmployee.id
 );
 }

 // Designations Pagination & Filtering
 designationSearchTerm: string = '';
 designationFilterDepartment: string = '';
 designationCurrentPage: number = 1;
 designationPageSize: number = 10;

 // Employees Pagination & Filtering
 employeeSearchTerm: string = '';
 employeeFilterDepartment: string = '';
 employeeFilterStatus: string = '';
 employeeCurrentPage: number = 1;
 employeePageSize: number = 10;

 showAddModal = false;
 showCredentialsModal = false;
 showDeleteConfirmModal = false;
 deleteConfirmConfig = {
   title: '',
   message: '',
   onConfirm: () => {}
 };
 generatedCredentials: any = null;
 activeTab: string = 'personal'; // 'personal', 'documents', 'assets'

 newEmployee: any = {
 firstName: '',
 lastName: '',
 email: '',
 department: '',
 role: '',
 grade: '',
 reportingTo: '',
 systemRole: 'employee', // System Access Level
 status: 'Active',
 employmentStatus: 'Full-time',
 salary: 0,
 documents: [],
 assets: [],
 emergencyContact: {
 name: '',
 relationship: '',
 phone: '',
 },
 };

 newAsset: any = {
 name: '',
 type: 'Laptop',
 serialNumber: '',
 assignedDate: new Date().toISOString().split('T')[0],
 status: 'Assigned',
 };

 newDocument: any = {
 name: '',
 type: 'Contract',
 expiryDate: '',
 file: null,
 url: '',
 };

 newDepartment: any = {
 name: '',
 head: '',
 };

 newDesignation: any = {
 title: '',
 department: '',
 grade: '',
 };

 private baseUrl = 'http://localhost:3000/api';
 currentUserRole: string = '';

 // Select Options for Reusable Components
 employmentStatusOptions = [
   { value: 'Full-time', label: 'Full-time' },
   { value: 'Part-time', label: 'Part-time' },
   { value: 'Contract', label: 'Contract' },
   { value: 'Intern', label: 'Intern' }
 ];

 systemRoleOptions = [
   { value: 'employee', label: 'Employee (Standard)' },
   { value: 'hr', label: 'HR Manager' },
   { value: 'manager', label: 'Manager' },
   { value: 'supervisor', label: 'Supervisor' },
   { value: 'accountant', label: 'Accountant' },
   { value: 'cto', label: 'CTO' },
   { value: 'admin', label: 'Admin' }
 ];

 statusOptions = [
   { value: 'Active', label: 'Active' },
   { value: 'Inactive', label: 'Inactive' }
 ];

 gradeOptions = [
   { value: 'Junior', label: 'Junior' },
   { value: 'Mid-Level', label: 'Mid-Level' },
   { value: 'Senior', label: 'Senior' },
   { value: 'Lead', label: 'Lead' },
   { value: 'Principal', label: 'Principal' },
   { value: 'Manager', label: 'Manager' },
   { value: 'Executive', label: 'Executive' }
 ];

 assetTypeOptions = [
   { value: 'Laptop', label: 'Laptop' },
   { value: 'Desktop', label: 'Desktop' },
   { value: 'Phone', label: 'Phone' },
   { value: 'Tablet', label: 'Tablet' },
   { value: 'Monitor', label: 'Monitor' },
   { value: 'Keyboard', label: 'Keyboard' },
   { value: 'Mouse', label: 'Mouse' },
   { value: 'Other', label: 'Other' }
 ];

 assetStatusOptions = [
   { value: 'Assigned', label: 'Assigned' },
   { value: 'Available', label: 'Available' },
   { value: 'Maintenance', label: 'Maintenance' },
   { value: 'Retired', label: 'Retired' }
 ];

 documentTypeOptions = [
   { value: 'Contract', label: 'Contract' },
   { value: 'ID', label: 'ID Document' },
   { value: 'Certificate', label: 'Certificate' },
   { value: 'Resume', label: 'Resume' },
   { value: 'Other', label: 'Other' }
 ];

 relationshipOptions = [
   { value: 'Spouse', label: 'Spouse' },
   { value: 'Parent', label: 'Parent' },
   { value: 'Sibling', label: 'Sibling' },
   { value: 'Child', label: 'Child' },
   { value: 'Friend', label: 'Friend' },
   { value: 'Other', label: 'Other' }
 ];

 // Helper getters for select options
 get departmentOptions() {
   return this.departments.map(d => ({ value: d.name, label: d.name }));
 }

 get designationOptions() {
   return this.getDesignationsByDepartment(this.newEmployee.department)
     .map(d => ({ value: d.title, label: d.title }));
 }

 get reportingToOptionsFormatted() {
   return this.reportingToOptions.map(e => ({ 
     value: e.id, 
     label: `${e.firstName} ${e.lastName}${e.role ? ' (' + e.role + ')' : ' (No role)'}` 
   }));
 }

 get gradeOptionsFormatted() {
   return this.uniqueGrades.map(g => ({ value: g, label: g }));
 }

 constructor(
 private http: HttpClient,
 private loaderService: LoaderService,
 private alertService: AlertService,
 private route: ActivatedRoute,
 private cdr: ChangeDetectorRef,
 private authService: AuthService,
 ) {}

 ngOnInit(): void {
 this.authService.user$.subscribe(user => {
 if (user) {
 this.currentUserRole = user.role;
 }
 });

 this.route.params.subscribe((params) => {
 this.currentView = params['view'] || 'all';
 this.loadDataForView();
 });
 }

 loadDataForView() {
 // Always fetch all data types because they are linked in the forms now
 this.fetchEmployees();
 this.fetchDepartments();
 this.fetchDesignations();
 }

 fetchEmployees() {
 this.loaderService.show();
 this.http.get<any[]>(`${this.baseUrl}/employees`).subscribe({
 next: (data) => {
 this.employees = data;
 this.loaderService.hide();
 },
 error: (error) => {
 console.error('Error fetching employees:', error);
 this.loaderService.hide();
 this.alertService.showAlert('error', 'Error', 'Failed to fetch employees');
 },
 });
 }

 fetchDepartments() {
 this.loaderService.show();
 this.http.get<any[]>(`${this.baseUrl}/departments`).subscribe({
 next: (data) => {
 this.departments = data;
 this.loaderService.hide();
 },
 error: (error) => {
 console.error('Error fetching departments:', error);
 this.loaderService.hide();
 this.alertService.showAlert('error', 'Error', 'Failed to fetch departments');
 },
 });
 }

 fetchDesignations() {
 this.loaderService.show();
 this.http.get<any[]>(`${this.baseUrl}/designations`).subscribe({
 next: (data) => {
 this.designations = data;
 this.loaderService.hide();
 },
 error: (error) => {
 console.error('Error fetching designations:', error);
 this.loaderService.hide();
 this.alertService.showAlert('error', 'Error', 'Failed to fetch designations');
 },
 });
 }

 get uniqueGrades(): string[] {
 const grades = this.designations
 .map(d => d.grade)
 .filter((g: string) => g && g !== 'N/A');
 return [...new Set(grades)] as string[];
 }

 // Designations Filtering & Pagination Logic
 get filteredDesignations(): any[] {
 let result = this.designations;

 // Filter by search term (title)
 if (this.designationSearchTerm.trim()) {
 const term = this.designationSearchTerm.toLowerCase();
 result = result.filter((d) => d.title.toLowerCase().includes(term));
 }

 // Filter by department
 if (this.designationFilterDepartment) {
 result = result.filter((d) => d.department === this.designationFilterDepartment);
 }

 return result;
 }

 get paginatedDesignations(): any[] {
 const start = (this.designationCurrentPage - 1) * this.designationPageSize;
 const end = start + this.designationPageSize;
 return this.filteredDesignations.slice(start, end);
 }

 get designationTotalPages(): number {
 return Math.ceil(this.filteredDesignations.length / this.designationPageSize);
 }

 get designationPageNumbers(): number[] {
 const total = this.designationTotalPages;
 const current = this.designationCurrentPage;
 const pages: number[] = [];

 // Show up to 5 page numbers centered around the current page
 let start = Math.max(1, current - 2);
 let end = Math.min(total, current + 2);

 // Adjust if at the beginning or end
 if (current <= 2) {
 end = Math.min(total, 5);
 } else if (current >= total - 1) {
 start = Math.max(1, total - 4);
 }

 for (let i = start; i <= end; i++) {
 pages.push(i);
 }
 return pages;
 }

 designationGoToPage(page: number): void {
 if (page >= 1 && page <= this.designationTotalPages) {
 this.designationCurrentPage = page;
 }
 }

 designationPrevPage(): void {
 if (this.designationCurrentPage > 1) {
 this.designationCurrentPage--;
 }
 }

 designationNextPage(): void {
 if (this.designationCurrentPage < this.designationTotalPages) {
 this.designationCurrentPage++;
 }
 }

 onDesignationSearchChange(): void {
 this.designationCurrentPage = 1; // Reset to first page when searching
 }

 onDesignationFilterChange(): void {
 this.designationCurrentPage = 1; // Reset to first page when filtering
 }

 // Employees Filtering & Pagination Logic
 get filteredEmployees(): any[] {
 let result = this.employees;

 // Filter by search term (name or email)
 if (this.employeeSearchTerm.trim()) {
 const term = this.employeeSearchTerm.toLowerCase();
 result = result.filter(
 (e) =>
 e.firstName.toLowerCase().includes(term) ||
 e.lastName.toLowerCase().includes(term) ||
 e.email.toLowerCase().includes(term),
 );
 }

 // Filter by department
 if (this.employeeFilterDepartment) {
 result = result.filter((e) => e.department === this.employeeFilterDepartment);
 }

 // Filter by status
 if (this.employeeFilterStatus) {
 result = result.filter((e) => e.status === this.employeeFilterStatus);
 }

 return result;
 }

 get paginatedEmployees(): any[] {
 const start = (this.employeeCurrentPage - 1) * this.employeePageSize;
 const end = start + this.employeePageSize;
 return this.filteredEmployees.slice(start, end);
 }

 get employeeTotalPages(): number {
 return Math.ceil(this.filteredEmployees.length / this.employeePageSize);
 }

 get employeePageNumbers(): number[] {
 const total = this.employeeTotalPages;
 const current = this.employeeCurrentPage;
 const pages: number[] = [];

 let start = Math.max(1, current - 2);
 let end = Math.min(total, current + 2);

 if (current <= 2) {
 end = Math.min(total, 5);
 } else if (current >= total - 1) {
 start = Math.max(1, total - 4);
 }

 for (let i = start; i <= end; i++) {
 pages.push(i);
 }
 return pages;
 }

 employeeGoToPage(page: number): void {
 if (page >= 1 && page <= this.employeeTotalPages) {
 this.employeeCurrentPage = page;
 }
 }

 employeePrevPage(): void {
 if (this.employeeCurrentPage > 1) {
 this.employeeCurrentPage--;
 }
 }

 employeeNextPage(): void {
 if (this.employeeCurrentPage < this.employeeTotalPages) {
 this.employeeCurrentPage++;
 }
 }

 onEmployeeSearchChange(): void {
 this.employeeCurrentPage = 1;
 }

 onEmployeeFilterChange(): void {
 this.employeeCurrentPage = 1;
 }

 // Department Details Logic
 selectedDepartment: any = null;

 viewDepartment(dept: any) {
 this.selectedDepartment = dept;
 this.currentView = 'department-details';
 if (this.employees.length === 0) {
 this.fetchEmployees();
 }
 }

 get departmentEmployees() {
 if (!this.selectedDepartment) return [];
 return this.employees.filter((e) => e.department === this.selectedDepartment.name);
 }

 backToDepartments() {
 this.selectedDepartment = null;
 this.currentView = 'departments';
 }

 openAddModal(deptName: string | null = null) {
 this.showAddModal = true;
 if (deptName) {
 this.newEmployee.department = deptName;
 }
 }

 closeAddModal() {
 this.showAddModal = false;
 this.resetForms();
 }

 // Helper for Department Card Avatars
 getEmployeesByDepartment(deptName: string) {
 return this.employees.filter((e) => e.department === deptName);
 }

 getDepartmentAvatars(deptName: string) {
 return this.getEmployeesByDepartment(deptName).slice(0, 3);
 }

 // Helper for Linked Designations
 getDesignationsByDepartment(deptName: string) {
 if (!deptName) return [];
 const normalizedDept = deptName.toString().trim().toLowerCase();
 const filtered = this.designations.filter((d) => {
 if (!d.department) return false;
 return d.department.toString().trim().toLowerCase() === normalizedDept;
 });
 // Log occasionally to help debug without spamming
 if (Math.random() < 0.01) {
 console.log(`Filtered designations for ${deptName}:`, filtered.length);
 }
 return filtered;
 }

 // Edit/Delete Logic
 editingEmployeeId: string | null = null;
 editingDepartmentId: string | null = null;
 editingDesignationId: string | null = null;

 editEmployee(employee: any) {
 // Flag to indicate we are in the middle of a sync
 console.log('--- STARTING EDIT Employee (Surgical Sync) ---', employee);
 this.editingEmployeeId = employee.id;

 // 1. Initial Data Load - Deep copy everything immediately
 this.newEmployee = JSON.parse(JSON.stringify(employee));

 // Ensure arrays are initialized
 if (!this.newEmployee.documents) this.newEmployee.documents = [];
 if (!this.newEmployee.assets) this.newEmployee.assets = [];
 if (!this.newEmployee.employmentStatus) {
 this.newEmployee.employmentStatus = 'Full-time';
 }
 if (!this.newEmployee.emergencyContact) {
 this.newEmployee.emergencyContact = { name: '', relationship: '', phone: '' };
 }

 // Ensure supporting lists are ready
 if (this.departments.length === 0) this.fetchDepartments();
 if (this.designations.length === 0) this.fetchDesignations();

 this.activeTab = 'personal';
 this.showAddModal = true;

 // 2. Surgical Timeout - ONLY sync the picklist values, don't re-assign the whole object
 // This prevents overwriting any documents/assets the user adds while we wait
 setTimeout(() => {
 console.log('Sync Stage 1: Setting Department');
 this.newEmployee.department = employee.department;
 this.cdr.detectChanges();

 setTimeout(() => {
 console.log('Sync Stage 2: Setting Role');
 this.newEmployee.role = employee.role;
 this.cdr.detectChanges();
 console.log('--- EDIT SYNC COMPLETE ---');
 }, 150);
 }, 250);
 }

 deleteEmployee(id: string) {
   this.deleteConfirmConfig = {
     title: 'Delete Employee',
     message: 'Are you sure you want to delete this employee? This action cannot be undone.',
     onConfirm: () => {
       this.showDeleteConfirmModal = false;
       this.loaderService.show();
       this.http.delete(`${this.baseUrl}/employees/${id}`).subscribe({
         next: () => {
           this.fetchEmployees();
           this.fetchDepartments();
           this.loaderService.hide();
           this.alertService.showAlert('success', 'Success', 'Employee deleted successfully');
         },
         error: (error) => {
           this.loaderService.hide();
           this.alertService.showAlert('error', 'Error', 'Failed to delete employee');
         },
       });
     }
   };
   this.showDeleteConfirmModal = true;
 }

 editDesignation(desig: any) {
 this.editingDesignationId = desig.id;
 this.newDesignation = { ...desig };
 if (this.departments.length === 0) {
 this.fetchDepartments();
 }
 this.openAddModal();
 }

 deleteDesignation(id: string) {
   this.deleteConfirmConfig = {
     title: 'Delete Designation',
     message: 'Are you sure you want to delete this designation? This action cannot be undone.',
     onConfirm: () => {
       this.showDeleteConfirmModal = false;
       this.loaderService.show();
       this.http.delete(`${this.baseUrl}/designations/${id}`).subscribe({
         next: () => {
           this.fetchDesignations();
           this.loaderService.hide();
           this.alertService.showAlert('success', 'Success', 'Designation deleted successfully');
         },
         error: (error) => {
           this.loaderService.hide();
           this.alertService.showAlert('error', 'Error', 'Failed to delete designation');
         },
       });
     }
   };
   this.showDeleteConfirmModal = true;
 }

 editDepartment(dept: any) {
 this.editingDepartmentId = dept.id;
 this.newDepartment = { ...dept };
 this.openAddModal();
 }

 deleteDepartment(id: string) {
   this.deleteConfirmConfig = {
     title: 'Delete Department',
     message: 'Are you sure you want to delete this department? This will not delete the employees in it, but they will no longer be associated with this department.',
     onConfirm: () => {
       this.showDeleteConfirmModal = false;
       this.loaderService.show();
       this.http.delete(`${this.baseUrl}/departments/${id}`).subscribe({
         next: () => {
           this.fetchDepartments();
           this.loaderService.hide();
           this.alertService.showAlert('success', 'Success', 'Department deleted successfully');
         },
         error: (error) => {
           this.loaderService.hide();
           this.alertService.showAlert('error', 'Error', 'Failed to delete department');
         },
       });
     }
   };
   this.showDeleteConfirmModal = true;
 }

 onFileSelected(event: any) {
 const file = event.target.files[0];
 if (file) {
 this.newDocument.file = file;
 this.newDocument.name = file.name; // Default name to filename
 const reader = new FileReader();
 reader.onload = (e: any) => {
 this.newDocument.url = e.target.result;
 };
 reader.readAsDataURL(file);
 }
 }

 addDocument() {
 if (!this.newDocument.file && !this.newDocument.url) {
 this.alertService.showAlert('error', 'Error', 'Please select a file');
 return;
 }

 // Ensure array exists
 if (!this.newEmployee.documents) {
 this.newEmployee.documents = [];
 }

 this.newEmployee.documents.push({ ...this.newDocument });

 // Reset newDocument
 this.newDocument = {
 name: '',
 type: 'Contract',
 expiryDate: '',
 file: null,
 url: '',
 };

 this.cdr.detectChanges();
 }

 removeDocument(index: number) {
 this.newEmployee.documents.splice(index, 1);
 }

 addAsset() {
 if (!this.newAsset.name) {
 this.alertService.showAlert('info', 'Alert', 'Asset name is required');
 return;
 }

 // Ensure array exists
 if (!this.newEmployee.assets) {
 this.newEmployee.assets = [];
 }

 this.newEmployee.assets.push({ ...this.newAsset, id: Date.now() });

 // Reset newAsset
 this.newAsset = {
 name: '',
 type: 'Laptop',
 serialNumber: '',
 assignedDate: new Date().toISOString().split('T')[0],
 status: 'Assigned',
 };

 this.cdr.detectChanges();
 }

 removeAsset(index: number) {
 this.newEmployee.assets.splice(index, 1);
 }

 switchTab(tab: string) {
 this.activeTab = tab;
 }

 resetForms() {
 this.editingEmployeeId = null;
 this.editingDepartmentId = null;
 this.editingDesignationId = null;
 
 // Clear search filters
 this.employeeSearchTerm = '';
 
 this.newEmployee = {
 firstName: '',
 lastName: '',
 email: '',
 department: '',
 role: '',
 status: 'Active',
 employmentStatus: 'Full-time',
 salary: 0,
 documents: [],
 assets: [],
 emergencyContact: {
 name: '',
 relationship: '',
 phone: '',
 },
 };
 this.activeTab = 'personal';
 this.newDepartment = {
 name: '',
 head: '',
 };
 this.newDesignation = {
 title: '',
 department: '',
 grade: '',
 };
 }

 submitForm() {
 if (this.currentView === 'all' || this.currentView === 'department-details') {
 if (this.editingEmployeeId) {
 this.updateEmployee();
 } else {
 this.addEmployee();
 }
 } else if (this.currentView === 'departments') {
 if (this.editingDepartmentId) {
 this.updateDepartment();
 } else {
 this.addDepartment();
 }
 } else if (this.currentView === 'designations') {
 if (this.editingDesignationId) {
 this.updateDesignation();
 } else {
 this.addDesignation();
 }
 }
 }

 // Form validation methods
 get isEmployeeFormValid(): boolean {
   return !!(
     this.newEmployee.firstName?.trim() &&
     this.newEmployee.lastName?.trim() &&
     this.newEmployee.email?.trim() &&
     this.newEmployee.department?.trim() &&
     this.newEmployee.role?.trim() &&
     this.newEmployee.systemRole?.trim() &&
     this.newEmployee.employmentStatus?.trim() &&
     this.newEmployee.status?.trim()
   );
 }

 get isDepartmentFormValid(): boolean {
   return !!(this.newDepartment.name?.trim());
 }

 get isDesignationFormValid(): boolean {
   return !!(
     this.newDesignation.title?.trim() &&
     this.newDesignation.department?.trim()
   );
 }

 get isFormValid(): boolean {
   if (this.currentView === 'all' || this.currentView === 'department-details') {
     return this.isEmployeeFormValid;
   } else if (this.currentView === 'departments') {
     return this.isDepartmentFormValid;
   } else if (this.currentView === 'designations') {
     return this.isDesignationFormValid;
   }
   return false;
 }

 addEmployee() {
 // Sanitize documents: strip the 'file' object which is not JSON-serializable
 const sanitizedNewEmployee = { ...this.newEmployee };
 if (sanitizedNewEmployee.documents) {
 sanitizedNewEmployee.documents = sanitizedNewEmployee.documents.map((doc: any) => {
 const { file, ...rest } = doc;
 return rest;
 });
 }

 const payloadSize = JSON.stringify(sanitizedNewEmployee).length;
 console.log('Submitting Add Employee:', {
 name: sanitizedNewEmployee.firstName,
 docs: sanitizedNewEmployee.documents?.length,
 assets: sanitizedNewEmployee.assets?.length,
 sizeMB: (payloadSize / 1024 / 1024).toFixed(2),
 });
 this.loaderService.show();
 this.http.post(`${this.baseUrl}/employees`, sanitizedNewEmployee).subscribe({
 next: (response: any) => {
 this.fetchEmployees();
 this.fetchDepartments();
 this.closeAddModal();
 this.loaderService.hide();

 // Show credentials if they were generated
 if (response.credentials) {
 this.generatedCredentials = response.credentials;
 this.showCredentialsModal = true;
 } else {
 this.alertService.showAlert('success', 'Success', 'Employee added successfully');
 }
 },
 error: (error: any) => {
 this.loaderService.hide();
 this.alertService.showAlert(
 'error',
 'Error',
 error.error?.message || 'Failed to add employee',
 );
 },
 });
 }

 updateEmployee() {
 // Sanitize documents: strip the 'file' object which is not JSON-serializable
 const sanitizedNewEmployee = { ...this.newEmployee };
 if (sanitizedNewEmployee.documents) {
 sanitizedNewEmployee.documents = sanitizedNewEmployee.documents.map((doc: any) => {
 const { file, ...rest } = doc;
 return rest;
 });
 }

 const payloadSize = JSON.stringify(sanitizedNewEmployee).length;
 console.log('Submitting Update Employee:', {
 id: this.editingEmployeeId,
 docs: sanitizedNewEmployee.documents?.length,
 assets: sanitizedNewEmployee.assets?.length,
 sizeMB: (payloadSize / 1024 / 1024).toFixed(2),
 });
 this.loaderService.show();
 this.http
 .put(`${this.baseUrl}/employees/${this.editingEmployeeId}`, sanitizedNewEmployee)
 .subscribe({
 next: () => {
 this.fetchEmployees();
 this.fetchDepartments();
 this.closeAddModal();
 this.loaderService.hide();
 this.alertService.showAlert('success', 'Success', 'Employee updated successfully');
 },
 error: (error: any) => {
 this.loaderService.hide();
 this.alertService.showAlert(
 'error',
 'Error',
 error.error?.message || 'Failed to update employee',
 );
 },
 });
 }

 addDepartment() {
 this.loaderService.show();
 this.http.post(`${this.baseUrl}/departments`, this.newDepartment).subscribe({
 next: () => {
 this.fetchDepartments();
 this.closeAddModal();
 this.loaderService.hide();
 this.alertService.showAlert('success', 'Success', 'Department added successfully');
 },
 error: (error: any) => {
 this.loaderService.hide();
 this.alertService.showAlert(
 'error',
 'Error',
 error.error?.message || 'Failed to add department',
 );
 },
 });
 }

 updateDepartment() {
 this.loaderService.show();
 this.http
 .put(`${this.baseUrl}/departments/${this.editingDepartmentId}`, this.newDepartment)
 .subscribe({
 next: () => {
 this.fetchDepartments();
 this.closeAddModal();
 this.loaderService.hide();
 this.alertService.showAlert('success', 'Success', 'Department updated successfully');
 },
 error: (error: any) => {
 this.loaderService.hide();
 this.alertService.showAlert(
 'error',
 'Error',
 error.error?.message || 'Failed to update department',
 );
 },
 });
 }

 addDesignation() {
 this.loaderService.show();
 this.http.post(`${this.baseUrl}/designations`, this.newDesignation).subscribe({
 next: () => {
 this.fetchDesignations();
 this.closeAddModal();
 this.loaderService.hide();
 this.alertService.showAlert('success', 'Success', 'Designation added successfully');
 },
 error: (error: any) => {
 this.loaderService.hide();
 this.alertService.showAlert(
 'error',
 'Error',
 error.error?.message || 'Failed to add designation',
 );
 },
 });
 }

 updateDesignation() {
 this.loaderService.show();
 this.http
 .put(`${this.baseUrl}/designations/${this.editingDesignationId}`, this.newDesignation)
 .subscribe({
 next: () => {
 this.fetchDesignations();
 this.closeAddModal();
 this.loaderService.hide();
 this.alertService.showAlert('success', 'Success', 'Designation updated successfully');
 },
 error: (error: any) => {
 this.loaderService.hide();
 this.alertService.showAlert(
 'error',
 'Error',
 error.error?.message || 'Failed to update designation',
 );
 },
 });
 }

 closeCredentialsModal() {
 this.showCredentialsModal = false;
 this.generatedCredentials = null;
 this.alertService.showAlert('success', 'Success', 'Employee and account created successfully!');
 }

 copyToClipboard(text: string) {
 navigator.clipboard.writeText(text).then(() => {
 this.alertService.showAlert('success', 'Copied', 'Copied to clipboard!');
 });
 }
}
