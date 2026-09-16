import { AlertService } from '../../../services/alert.service';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../../services/leave.service';
import { AuthService } from '../../../services/auth.service';
// Import Reusable Components
import { FormInputComponent } from '../../shared/form-input/form-input.component';
import { FormSelectComponent } from '../../shared/form-select/form-select.component';
import { FormTextareaComponent } from '../../shared/form-textarea/form-textarea.component';
import { ButtonComponent } from '../../shared/button/button.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';
import { getLeaveStatusVariant } from '../../../utils/status.util';

@Component({
 selector: 'app-leave-request',
 standalone: true,
 imports: [
   CommonModule, 
   FormsModule,
   FormInputComponent,
   FormSelectComponent,
   FormTextareaComponent,
   ButtonComponent,
   StatusBadgeComponent,
   ConfirmationModalComponent,
   EmptyStateComponent,
   SpinnerComponent
 ],
 templateUrl: './leave-request.html',
 styleUrl: './leave-request.css'
})
export class LeaveRequestComponent implements OnInit {
  private alertService = inject(AlertService);
 user: any;
 myLeaves: any[] = [];
 leaveBalance: any = null;
 eligiblePolicies: any[] = [];
 selectedPolicy: any = null;
 loading = false;
 loadingBalance = false;
 isModalOpen = false;
 showDeleteConfirmModal = false;
 showCancelConfirmModal = false;
 deleteConfirmConfig = {
   title: '',
   message: '',
   leaveId: 0,
   onConfirm: () => {}
 };
 cancelConfirmConfig = {
   title: '',
   message: '',
   leaveId: 0,
   onConfirm: () => {}
 };
 leaveToDelete: any = null;
 leaveToCancel: any = null;
 deleting = false;
 cancelling = false;

 newLeave = {
 policyCode: '',
 startDate: '',
 endDate: '',
 reason: '',
 documentUrl: ''
 };
 
 // Calculated working days
 calculatedDays: number | null = null;
 calculatingDays = false;
 
 // Select options for reusable components
 leaveTypeOptions: any[] = [];

 // Pagination & Search
 myLeavesPage = 1;
 pageSize = 10;
 searchTerm: string = '';

 get filteredMyLeaves(): any[] {
 let filtered = this.myLeaves;
 if (this.searchTerm) {
 const term = this.searchTerm.toLowerCase();
 filtered = filtered.filter(l => 
 (l.leaveType || '').toLowerCase().includes(term) ||
 (l.status || '').toLowerCase().includes(term)
 );
 }
 return filtered;
 }

 get paginatedMyLeaves(): any[] {
 const start = (this.myLeavesPage - 1) * this.pageSize;
 return this.filteredMyLeaves.slice(start, start + this.pageSize);
 }

 get myLeavesTotalPages(): number {
 return Math.ceil(this.filteredMyLeaves.length / this.pageSize) || 1;
 }

 onSearch() {
 this.myLeavesPage = 1;
 }

 constructor(
 private leaveService: LeaveService,
 private authService: AuthService
 ) {}

 ngOnInit() {
 this.authService.user$.subscribe((u) => {
 this.user = u;
 if (this.user) {
 this.loadMyLeaves();
 this.loadMyBalance();
 this.loadEligiblePolicies();
 }
 });
 }

 loadMyLeaves() {
 this.loading = true;
 this.leaveService.getMyLeaves().subscribe({
 next: (response: any) => {
 this.myLeaves = (response.leaves || response || []).reverse();
 this.loading = false;
 },
 error: (err) => {
 console.error('Error loading leaves:', err);
 this.loading = false;
 },
 });
 }

 loadMyBalance() {
 this.loadingBalance = true;
 this.leaveService.getMyBalance().subscribe({
 next: (response: any) => {
 console.log('=== Balance Response ===', response);
 
 // Backend returns { balances: {...}, policies: [...] }
 // Use the policies array which has formatted data
  if (response.policies && Array.isArray(response.policies)) {
    this.leaveBalance = response.policies.map((policy: any) => ({
      leaveType: policy.name,
      available: policy.balance || 0,
      used: policy.used || 0,
      total: policy.total || policy.balance || 0,
      code: policy.code
    }));
 } else if (response.balances) {
   // Fallback: Convert balances object to array
   const balancesObj = response.balances;
   this.leaveBalance = Object.entries(balancesObj).map(([leaveType, balance]) => ({
     leaveType: leaveType.charAt(0).toUpperCase() + leaveType.slice(1),
     available: typeof balance === 'number' ? balance : 0,
     used: 0,
     total: typeof balance === 'number' ? balance : 0,
     code: leaveType
   }));
 } else {
   this.leaveBalance = [];
 }
 
 console.log('=== Formatted Balance ===', this.leaveBalance);
 this.loadingBalance = false;
 },
 error: (err) => {
 console.error('Error loading balance:', err);
 this.loadingBalance = false;
 },
 });
 }

 loadEligiblePolicies() {
   console.log('=== Loading Eligible Policies ===');
   this.leaveService.getEligiblePolicies().subscribe({
     next: (response: any) => {
       console.log('Eligible policies response:', response);
       // The backend returns array directly, not wrapped in { policies: [] }
       this.eligiblePolicies = Array.isArray(response) ? response : (response.policies || []);
       
       // Update leave type options when policies are loaded
       this.leaveTypeOptions = this.eligiblePolicies.map(policy => ({ 
         value: policy.code, 
         label: `${policy.name} (${policy.daysPerYear} days/year)` 
       }));
       
       console.log('Eligible policies loaded:', this.eligiblePolicies.length);
     },
     error: (err) => {
       console.error('Error loading policies:', err);
       console.error('Error status:', err.status);
       console.error('Error message:', err.error?.message || err.message);
       this.alertService.showAlert('error', 'Error', 'Failed to load leave types');
     },
   });
 }

 onPolicyChange() {
   this.selectedPolicy = this.eligiblePolicies.find(p => p.code === this.newLeave.policyCode);
   this.calculatedDays = null;
   
   // Recalculate days if dates are already selected
   if (this.newLeave.startDate && this.newLeave.endDate) {
     this.calculateWorkingDays();
   }
 }

 onDateChange() {
   if (this.newLeave.startDate && this.newLeave.endDate) {
     this.calculateWorkingDays();
   } else {
     this.calculatedDays = null;
   }
 }

 calculateWorkingDays() {
   if (!this.newLeave.startDate || !this.newLeave.endDate) {
     return;
   }

   this.calculatingDays = true;
   this.leaveService.calculateWorkingDays(
     this.newLeave.startDate, 
     this.newLeave.endDate
   ).subscribe({
     next: (response: any) => {
       this.calculatedDays = response.workingDays || response.days;
       this.calculatingDays = false;
     },
     error: (err) => {
       console.error('Error calculating days:', err);
       this.calculatingDays = false;
     }
   });
 }

 getBalanceForPolicy(policyCode: string): number {
   if (!this.leaveBalance || !Array.isArray(this.leaveBalance)) return 0;
   const balance = this.leaveBalance.find((b: any) => 
     b.code && b.code.toLowerCase() === policyCode.toLowerCase()
   );
   return balance?.available || 0;
 }

 isPolicyRequiringDocumentation(): boolean {
   if (!this.selectedPolicy || !this.calculatedDays) return false;
   return this.selectedPolicy.requireDocumentation && 
          this.calculatedDays >= this.selectedPolicy.minDocumentationDays;
 }

 submitLeave() {
 // Validation
 if (!this.newLeave.policyCode) {
 this.alertService.showAlert('error', 'Validation Error', 'Please select a leave type');
 return;
 }
 if (!this.newLeave.startDate || !this.newLeave.endDate) {
 this.alertService.showAlert('error', 'Validation Error', 'Please select start and end dates');
 return;
 }
 if (this.isPolicyRequiringDocumentation() && !this.newLeave.documentUrl) {
 this.alertService.showAlert('error', 'Validation Error', 'Documentation is required for this leave request');
 return;
 }

 this.loading = true;
 
 // Transform policyCode to leaveType for backend
 const requestPayload = {
   leaveType: this.newLeave.policyCode,
   startDate: this.newLeave.startDate,
   endDate: this.newLeave.endDate,
   reason: this.newLeave.reason || 'No reason provided',
   attachments: this.newLeave.documentUrl ? [this.newLeave.documentUrl] : []
 };
 
 console.log('=== Submitting Leave Request ===');
 console.log('Payload:', requestPayload);
 
 this.leaveService.requestLeave(requestPayload).subscribe({
 next: (response: any) => {
 console.log('Leave request response:', response);
 this.alertService.showAlert('success', 'Success', 'Leave request submitted successfully!');
 this.loadMyLeaves();
 this.loadMyBalance();
 this.newLeave = { 
   policyCode: '', 
   startDate: '', 
   endDate: '', 
   reason: '',
   documentUrl: ''
 };
 this.selectedPolicy = null;
 this.calculatedDays = null;
 this.loading = false;
 this.isModalOpen = false;
 },
 error: (err) => {
 console.error('=== Leave Request Error ===');
 console.error('Error object:', err);
 console.error('Error status:', err.status);
 console.error('Error message:', err.error?.message || err.message);
 console.error('Error details:', err.error);
 this.alertService.showAlert('error', 'Error', err.error?.message || 'Error submitting leave request');
 this.loading = false;
 },
 });
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
 this.myLeavesPage = Math.max(1, Math.min(page, this.myLeavesTotalPages));
 }

 getPageNumbers(totalPages: number): number[] {
 return Array.from({ length: totalPages }, (_, i) => i + 1);
 }

 openDeleteModal(leave: any) {
 this.leaveToDelete = leave;
 this.deleteConfirmConfig = {
 title: 'Delete Leave Request',
 message: 'Are you sure you want to delete this pending leave request? This action cannot be undone.',
 leaveId: leave.id,
 onConfirm: () => this.confirmDelete(leave.id)
 };
 this.showDeleteConfirmModal = true;
 }

 confirmDelete(leaveId: number) {
 if (!leaveId) return;
 
 this.deleting = true;
 this.leaveService.deleteLeaveRequest(leaveId).subscribe({
 next: () => {
 this.alertService.showAlert('success', 'Success', 'Leave request deleted successfully');
 this.loadMyLeaves();
 this.loadMyBalance();
 this.showDeleteConfirmModal = false;
 this.deleting = false;
 },
 error: (err) => {
 this.alertService.showAlert('error', 'Error', err.error?.message || 'Error deleting leave request');
 this.deleting = false;
 }
 });
 }

 openCancelModal(leave: any) {
 this.leaveToCancel = leave;
 this.cancelConfirmConfig = {
 title: 'Cancel Leave Request',
 message: 'Are you sure you want to cancel this approved leave? Your balance will be restored.',
 leaveId: leave.id,
 onConfirm: () => this.confirmCancel(leave.id)
 };
 this.showCancelConfirmModal = true;
 }

 confirmCancel(leaveId: number) {
 if (!leaveId) return;
 
 this.cancelling = true;
 this.leaveService.cancelLeaveRequest(leaveId, 'Employee requested cancellation').subscribe({
 next: () => {
 this.alertService.showAlert('success', 'Success', 'Leave request cancelled successfully');
 this.loadMyLeaves();
 this.loadMyBalance();
 this.showCancelConfirmModal = false;
 this.cancelling = false;
 },
 error: (err) => {
 this.alertService.showAlert('error', 'Error', err.error?.message || 'Error cancelling leave request');
 this.cancelling = false;
 }
 });
 }

 canDeleteLeave(leave: any): boolean {
   return leave.status === 'Pending' || leave.status === 'pending';
 }

 canCancelLeave(leave: any): boolean {
   return leave.status === 'Approved' || leave.status === 'approved';
 }

 getStatusBadgeType(status: string) {
   return getLeaveStatusVariant(status);
 }

 formatDate(dateString: string): string {
   if (!dateString) return '';
   const date = new Date(dateString);
   return date.toLocaleDateString('en-US', { 
     year: 'numeric', 
     month: 'short', 
     day: 'numeric' 
   });
 }

 calculateLeaveDuration(startDate: string, endDate: string): number {
   if (!startDate || !endDate) return 0;
   const start = new Date(startDate);
   const end = new Date(endDate);
   const diffTime = Math.abs(end.getTime() - start.getTime());
   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
   return diffDays + 1;
 }
}
