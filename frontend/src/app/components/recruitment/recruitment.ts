import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { LoaderService } from '../../services/loader.service';
import { AlertService } from '../../services/alert.service';
// Import Reusable Components
import { FormInputComponent } from '../shared/form-input/form-input.component';
import { FormSelectComponent } from '../shared/form-select/form-select.component';
import { FormTextareaComponent } from '../shared/form-textarea/form-textarea.component';
import { ButtonComponent } from '../shared/button/button.component';

@Component({
 selector: 'app-recruitment',
 standalone: true,
 imports: [
   CommonModule, 
   FormsModule, 
   DragDropModule, 
   ScrollingModule,
   FormInputComponent,
   FormSelectComponent,
   FormTextareaComponent,
   ButtonComponent
 ],
 templateUrl: './recruitment.html',
 styleUrl: './recruitment.css',
})
export class Recruitment implements OnInit, OnDestroy {
 candidates: any[] = [];
 showAddModal = false;
 showScheduleModal = false;
 selectedCandidate: any = null;
 interviewDate: string = '';
 
 newCandidate: any = {
 name: '',
 email: '',
 role: '',
 stage: 'Applied',
 skills: '',
 notes: '',
 rating: ''
 };
 resumeFile: File | null = null;
 showPreviewModal = false;
 previewContent = '';
 previewCandidate: any = null;

 private apiUrl = 'http://localhost:3000/api/recruitment';

 filterSkills = '';
 private pollingInterval: any;

 constructor(
 private http: HttpClient,
 private loaderService: LoaderService,
 private alertService: AlertService
 ) {}

 ngOnInit(): void {
 this.fetchCandidates();
 // Poll every 30 seconds to keep UI in sync with backend (e.g. interview completion status)
 this.pollingInterval = setInterval(() => {
 this.fetchCandidates(true); // Pass true to suppress loader
 }, 30000);
 }

 ngOnDestroy(): void {
 if (this.pollingInterval) {
 clearInterval(this.pollingInterval);
 }
 }

 fetchCandidates(suppressLoader = false) {
 if (!suppressLoader) this.loaderService.show();
 this.http.get<any[]>(this.apiUrl).subscribe({
 next: (data) => {
 this.candidates = data;
 if (!suppressLoader) this.loaderService.hide();
 },
 error: (error) => {
 console.error('Error fetching candidates:', error);
 if (!suppressLoader) this.loaderService.hide();
 // Don't show alert on background polling failure to avoid annoying user
 if (!suppressLoader) this.alertService.showAlert('error', 'Error', 'Failed to fetch candidates');
 }
 });
 }

 isEditing = false;
 editingId: number | null = null;

 openAddModal() {
 this.isEditing = false;
 this.editingId = null;
 this.showAddModal = true;
 }

 openEditModal(candidate: any) {
 this.isEditing = true;
 this.editingId = candidate.id;
 this.newCandidate = {
 name: candidate.name,
 email: candidate.email,
 role: candidate.role,
 stage: candidate.stage,
 skills: candidate.skills ? candidate.skills.join(', ') : '',
 notes: candidate.notes || '',
 rating: candidate.rating || ''
 };
 this.resumeFile = null;
 this.showAddModal = true;
 }

 closeAddModal() {
 this.showAddModal = false;
 this.isEditing = false;
 this.editingId = null;
 this.newCandidate = {
 name: '',
 email: '',
 role: '',
 stage: 'Applied',
 skills: '',
 notes: '',
 rating: ''
 };
 this.resumeFile = null;
 }

 saveCandidate() {
 this.loaderService.show();
 
 // Convert comma-separated skills string to array
 const skillsArray = this.newCandidate.skills 
 ? this.newCandidate.skills.split(',').map((s: string) => s.trim()) 
 : [];

 const candidatePayload = { ...this.newCandidate, skills: skillsArray };

 if (this.isEditing && this.editingId) {
 this.http.put(`${this.apiUrl}/${this.editingId}/details`, candidatePayload).subscribe({
 next: (response) => {
 console.log('Candidate updated:', response);
 this.fetchCandidates();
 this.closeAddModal();
 this.loaderService.hide();
 this.alertService.showAlert('success', 'Success', 'Candidate updated successfully');
 },
 error: (error) => {
 console.error('Error updating candidate:', error);
 this.loaderService.hide();
 this.alertService.showAlert('error', 'Error', 'Failed to update candidate.');
 }
 });
 return;
 }

 const formData = new FormData();
 formData.append('name', this.newCandidate.name);
 formData.append('email', this.newCandidate.email);
 formData.append('role', this.newCandidate.role);
 formData.append('stage', this.newCandidate.stage);
 formData.append('notes', this.newCandidate.notes || '');
 formData.append('rating', this.newCandidate.rating || '');
 formData.append('skills', JSON.stringify(skillsArray));
 if (this.resumeFile) {
 formData.append('resume', this.resumeFile, this.resumeFile.name);
 }

 this.http.post(this.apiUrl, formData).subscribe({
 next: (response) => {
 console.log('Candidate added:', response);
 this.fetchCandidates();
 this.closeAddModal();
 this.loaderService.hide();
 this.alertService.showAlert('success', 'Success', 'Candidate added successfully');
 },
 error: (error) => {
 console.error('Error adding candidate:', error);
 this.loaderService.hide();
 this.alertService.showAlert('error', 'Error', 'Failed to add candidate. Please try again.');
 }
 });
 }

 previewResume(candidate: any) {
 if (!candidate.resumeFilename) {
 this.alertService.showAlert('info', 'No resume', 'No resume file available for this candidate');
 return;
 }
 const url = `http://localhost:3000/uploads/resumes/${candidate.resumeFilename}`;
 this.previewCandidate = candidate;
 this.previewContent = '';
 this.showPreviewModal = true;
 fetch(url)
 .then((r) => r.text())
 .then((t) => {
 this.previewContent = t;
 })
 .catch((err) => {
 console.error('Preview error', err);
 this.previewContent = 'Unable to preview file. You can download it instead.';
 });
 }

 downloadResume(candidate: any) {
 if (!candidate.resumeFilename) return;
 const url = `http://localhost:3000/uploads/resumes/${candidate.resumeFilename}`;
 window.open(url, '_blank');
 }

 deleteCandidate(candidate: any) {
 if (confirm(`Are you sure you want to delete ${candidate.name}?`)) {
 this.loaderService.show();
 this.http.delete(`${this.apiUrl}/${candidate.id}`).subscribe({
 next: () => {
 this.fetchCandidates();
 this.loaderService.hide();
 this.alertService.showAlert('success', 'Success', 'Candidate deleted successfully');
 },
 error: (error) => {
 console.error('Error deleting candidate:', error);
 this.loaderService.hide();
 this.alertService.showAlert('error', 'Error', 'Failed to delete candidate.');
 }
 });
 }
 }

 updateStage(candidate: any, newStage: string) {
 this.loaderService.show();
 this.http.put(`${this.apiUrl}/${candidate.id}/stage`, { stage: newStage }).subscribe({
 next: () => {
 candidate.stage = newStage;
 this.loaderService.hide();
 },
 error: (error) => {
 console.error('Error updating stage:', error);
 this.loaderService.hide();
 this.alertService.showAlert('error', 'Error', 'Failed to update stage.');
 this.fetchCandidates(); // Revert UI on error
 }
 });
 }

 // Drag & Drop Handler
 drop(event: CdkDragDrop<any[]>, newStage: string) {
 if (event.previousContainer === event.container) {
 moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
 } else {
 const candidate = event.previousContainer.data[event.previousIndex];
 transferArrayItem(
 event.previousContainer.data,
 event.container.data,
 event.previousIndex,
 event.currentIndex,
 );
 this.updateStage(candidate, newStage);
 }
 }

 // Manual Scheduling
 openScheduleModal(candidate: any) {
 this.selectedCandidate = candidate;
 this.showScheduleModal = true;
 // Default to tomorrow at 10 AM
 const tomorrow = new Date();
 tomorrow.setDate(tomorrow.getDate() + 1);
 tomorrow.setHours(10, 0, 0, 0);
 this.interviewDate = tomorrow.toISOString().slice(0, 16); // Format for datetime-local
 }

 closeScheduleModal() {
 this.showScheduleModal = false;
 this.selectedCandidate = null;
 this.interviewDate = '';
 }

 scheduleInterview() {
 if (!this.selectedCandidate || !this.interviewDate) return;

 this.loaderService.show();
 this.http.post(`${this.apiUrl}/${this.selectedCandidate.id}/schedule`, { date: this.interviewDate }).subscribe({
 next: (response: any) => {
 this.selectedCandidate.stage = 'Interview';
 this.selectedCandidate.interviewDate = this.interviewDate;
 const scheduledDate = this.interviewDate; // Capture date before clearing
 this.fetchCandidates(); // Refresh to ensure list consistency
 this.closeScheduleModal();
 this.loaderService.hide();
 
 let message = `Interview scheduled for ${new Date(scheduledDate).toLocaleString()}`;
 if (response.emailPreviewUrl) {
 window.open(response.emailPreviewUrl, '_blank');
 message += '. Email preview opened in new tab.';
 }
 
 this.alertService.showAlert('success', 'Success', message);
 },
 error: (error) => {
 console.error('Error scheduling interview:', error);
 this.loaderService.hide();
 this.alertService.showAlert('error', 'Error', 'Failed to schedule interview.');
 }
 });
 }

 // Search & Filter Properties
 searchTerm = '';
 showFilters = false;
 filterRole = '';
 filterStage = '';

 // Available options for dropdowns
 roles = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI/UX Designer', 'HR Manager'];
 stages = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'];

 // Select options for reusable components
 get roleOptions() {
   return this.roles.map(role => ({ value: role, label: role }));
 }
 
 get stageOptions() {
   return this.stages.map(stage => ({ value: stage, label: stage }));
 }

 get roleOptionsWithAll() {
   return [{ value: '', label: 'All Roles' }, ...this.roleOptions];
 }

 get stageOptionsWithAll() {
   return [{ value: '', label: 'All Stages' }, ...this.stageOptions];
 }

 toggleFilters() {
 this.showFilters = !this.showFilters;
 }

 onResumeSelected(event: Event) {
 const input = event.target as HTMLInputElement;
 this.resumeFile = input.files?.[0] || null;
 }

 clearFilters() {
 this.searchTerm = '';
 this.filterRole = '';
 this.filterStage = '';
 this.filterSkills = ''; // Keep legacy property for now if needed, or remove
 }

 getCandidatesByStage(stage: string): any[] {
 // First, filter by the column stage (Kanban logic)
 let filtered = this.candidates.filter((c: any) => c.stage === stage);
 
 // 1. Global Search (Name or Skills)
 if (this.searchTerm) {
 const term = this.searchTerm.toLowerCase();
 filtered = filtered.filter((c: any) => 
 (c.name && c.name.toLowerCase().includes(term)) ||
 (c.skills && c.skills.some((s: string) => s.toLowerCase().includes(term)))
 );
 }

 // 2. Role Filter
 if (this.filterRole) {
 filtered = filtered.filter((c: any) => c.role === this.filterRole);
 }

 // 3. Stage Filter (Global override - if user selects a specific stage in filters, 
 // strictly speaking, Kanban columns already filter by stage. 
 // But if the user wants to "focus" on one stage, we might want to hide other columns 
 // or just ensure this column matches. 
 // For a Kanban board, filtering by stage usually means "Show me only the Interview column".
 // However, the method `getCandidatesByStage` is called FOR each column.
 // So if I select "Interview" in the filter, the "Applied" column should probably be empty?
 // Let's implement it such that if filterStage is set, only that column has data.
 if (this.filterStage && this.filterStage !== stage) {
 return [];
 }

 return filtered;
 }
}
