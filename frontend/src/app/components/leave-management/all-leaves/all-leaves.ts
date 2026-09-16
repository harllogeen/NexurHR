import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../../services/leave.service';
import { AuthService } from '../../../services/auth.service';
// Import Reusable Components
import { FormInputComponent } from '../../shared/form-input/form-input.component';
import { ButtonComponent } from '../../shared/button/button.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { getLeaveStatusVariant } from '../../../utils/status.util';

@Component({
 selector: 'app-all-leaves',
 standalone: true,
 imports: [
   CommonModule, 
   FormsModule,
   FormInputComponent,
   ButtonComponent,
   StatusBadgeComponent
 ],
 templateUrl: './all-leaves.html',
 styleUrl: './all-leaves.css'
})
export class AllLeavesComponent implements OnInit {
 user: any;
 allLeaves: any[] = [];
 loading = false;
 allAppsFilter: string = 'all';
 searchTerm: string = '';

 get filteredAllLeaves(): any[] {
 let filtered = this.allLeaves;
 if (this.allAppsFilter !== 'all') {
 filtered = filtered.filter(l => l.status === this.allAppsFilter);
 }
 if (this.searchTerm) {
 const term = this.searchTerm.toLowerCase();
 filtered = filtered.filter(l => 
 (l.userName || '').toLowerCase().includes(term) ||
 (l.department || '').toLowerCase().includes(term) ||
 (l.leaveType || '').toLowerCase().includes(term) ||
 (l.userId?.toString() || '').includes(term)
 );
 }
 return filtered;
 }

 // Pagination
 allAppsPage = 1;
 pageSize = 10;

 get paginatedAllLeaves(): any[] {
 const start = (this.allAppsPage - 1) * this.pageSize;
 return this.filteredAllLeaves.slice(start, start + this.pageSize);
 }

 get allLeavesTotalPages(): number {
 return Math.ceil(this.filteredAllLeaves.length / this.pageSize) || 1;
 }

 constructor(
 private leaveService: LeaveService,
 private authService: AuthService
 ) {}

 ngOnInit() {
 this.authService.user$.subscribe((u) => {
 this.user = u;
 if (this.user && this.user.role !== 'employee') {
 this.loadAllLeaves();
 }
 });
 }

 loadAllLeaves() {
 this.loading = true;
 this.leaveService.getAllLeaves().subscribe({
 next: (response: any) => {
 console.log('All leaves response:', response);
 const leavesArray = response.leaves || response || [];
 console.log('First leave sample:', leavesArray[0]);
 this.allLeaves = [...leavesArray].reverse();
 this.loading = false;
 },
 error: (err) => {
 console.error(err);
 this.loading = false;
 },
 });
 }

 onFilterChange() {
 this.allAppsPage = 1;
 }

 onSearch() {
 this.allAppsPage = 1;
 }

 getStatusClass(status: string) {
 switch (status) {
 case 'Approved':
 return 'bg-green-100 text-green-800';
 case 'Rejected':
 return 'bg-red-100 text-red-800';
 default:
 return 'bg-yellow-100 text-yellow-800';
 }
 }

 goToPage(page: number) {
 this.allAppsPage = Math.max(1, Math.min(page, this.allLeavesTotalPages));
 }

 getPageNumbers(totalPages: number): number[] {
 return Array.from({ length: totalPages }, (_, i) => i + 1);
 }

 getStatusVariant(status: string) {
   return getLeaveStatusVariant(status);
 }
}
