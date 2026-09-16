import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../../services/leave.service';
import { AlertService } from '../../../services/alert.service';
import { FormInputComponent } from '../../shared/form-input/form-input.component';
import { ButtonComponent } from '../../shared/button/button.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { ApprovalModalComponent } from '../../shared/approval-modal/approval-modal.component';
import { getLeaveStatusVariant } from '../../../utils/status.util';

interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  leaveType: string;
  leaveTypeLabel: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
  currentApprover?: string;
  workflowStage?: string;
}

@Component({
  selector: 'app-team-leave-approval',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FormInputComponent,
    ButtonComponent,
    StatusBadgeComponent,
    ApprovalModalComponent
  ],
  templateUrl: './team-leave-approval.component.html',
  styleUrls: ['./team-leave-approval.component.css']
})
export class TeamLeaveApprovalComponent implements OnInit {
  // Data
  pendingApprovals: LeaveRequest[] = [];
  filteredApprovals: LeaveRequest[] = [];
  
  // Filters
  departmentFilter: string = '';
  leaveTypeFilter: string = '';
  searchQuery: string = '';
  
  // Modal state
  showActionModal = false;
  selectedRequest: LeaveRequest | null = null;
  actionType: 'approve' | 'reject' | null = null;
  actionComments: string = '';
  
  // Loading states
  loading = false;
  processingAction = false;
  
  // Options
  departments: string[] = [];
  departmentOptions: any[] = [];
  leaveTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'casual', label: 'Casual Leave' },
    { value: 'maternity', label: 'Maternity Leave' },
    { value: 'paternity', label: 'Paternity Leave' },
    { value: 'unpaid', label: 'Unpaid Leave' }
  ];

  constructor(
    private leaveService: LeaveService,
    private alertService: AlertService
  ) {
    console.log('===== TeamLeaveApprovalComponent Constructor Called =====');
    console.log('Component is being initialized');
  }

  ngOnInit() {
    console.log('===== TeamLeaveApprovalComponent ngOnInit Called =====');
    this.loadPendingApprovals();
  }

  loadPendingApprovals() {
    this.loading = true;
    this.leaveService.getMyApprovals().subscribe({
      next: (response: any) => {
        console.log('=== My Approvals Response ===', response);
        this.pendingApprovals = response.approvals || response || [];
        console.log('Pending approvals:', this.pendingApprovals);
        this.extractDepartments();
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load approvals:', error);
        this.alertService.showAlert('error', 'Failed to load pending approvals', error.error?.message || '');
        this.loading = false;
      }
    });
  }

  extractDepartments() {
    const deptSet = new Set<string>();
    this.pendingApprovals.forEach(req => {
      if (req.department) deptSet.add(req.department);
    });
    this.departments = Array.from(deptSet).sort();
    
    // Update department options
    this.departmentOptions = [
      { value: '', label: 'All Departments' },
      ...this.departments.map(d => ({ value: d, label: d }))
    ];
  }

  applyFilters() {
    let filtered = [...this.pendingApprovals];

    // Department filter
    if (this.departmentFilter) {
      filtered = filtered.filter(req => req.department === this.departmentFilter);
    }

    // Leave type filter
    if (this.leaveTypeFilter) {
      filtered = filtered.filter(req => req.leaveType === this.leaveTypeFilter);
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        req.employeeName.toLowerCase().includes(query) ||
        req.reason.toLowerCase().includes(query)
      );
    }

    this.filteredApprovals = filtered;
  }

  onFilterChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.departmentFilter = '';
    this.leaveTypeFilter = '';
    this.searchQuery = '';
    this.applyFilters();
  }

  openActionModal(request: LeaveRequest, action: 'approve' | 'reject') {
    console.log('=== openActionModal called ===');
    console.log('Request:', request);
    console.log('Action:', action);
    this.selectedRequest = request;
    this.actionType = action;
    this.actionComments = '';
    this.showActionModal = true;
    console.log('Modal should be open now, showActionModal:', this.showActionModal);
  }

  closeActionModal() {
    this.showActionModal = false;
    this.selectedRequest = null;
    this.actionType = null;
    this.actionComments = '';
  }

  confirmAction() {
    if (!this.selectedRequest || !this.actionType) return;

    this.processingAction = true;
    this.leaveService.updateLeaveStatus(
      this.selectedRequest.id,
      this.actionType,
      this.actionComments || undefined
    ).subscribe({
      next: () => {
        this.alertService.showAlert(
          'success',
          `Leave request ${this.actionType}d successfully`,
          ''
        );
        this.closeActionModal();
        this.loadPendingApprovals();
        this.processingAction = false;
      },
      error: (error) => {
        console.error('Failed to process action:', error);
        this.alertService.showAlert(
          'error',
          `Failed to ${this.actionType} leave request`,
          error.error?.message || ''
        );
        this.processingAction = false;
      }
    });
  }

  quickApprove(request: LeaveRequest) {
    if (!confirm(`Are you sure you want to approve ${request.employeeName}'s leave request?`)) {
      return;
    }

    this.leaveService.updateLeaveStatus(request.id, 'approve').subscribe({
      next: () => {
        this.alertService.showAlert('success', 'Leave request approved successfully', '');
        this.loadPendingApprovals();
      },
      error: (error) => {
        console.error('Failed to approve:', error);
        this.alertService.showAlert(
          'error',
          'Failed to approve leave request',
          error.error?.message || ''
        );
      }
    });
  }

  getStatusBadgeType(status: string) {
    return getLeaveStatusVariant(status);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getDaysLabel(days: number): string {
    return days === 1 ? '1 day' : `${days} days`;
  }

  getSummaryContent(): string {
    if (!this.selectedRequest) return '';
    return `
      <strong>${this.selectedRequest.leaveTypeLabel}</strong><br>
      ${this.formatDate(this.selectedRequest.startDate)} - ${this.formatDate(this.selectedRequest.endDate)}<br>
      ${this.getDaysLabel(this.selectedRequest.days)}
    `;
  }

  // Test function for debugging
  testClick() {
    console.log('TEST CLICK WORKED!');
    alert('Test click function was called!');
  }
}
