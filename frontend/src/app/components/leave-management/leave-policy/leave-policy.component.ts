import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../../services/leave.service';
import { AlertService } from '../../../services/alert.service';

// Import Reusable Components
import { FormInputComponent } from '../../shared/form-input/form-input.component';
import { FormSelectComponent } from '../../shared/form-select/form-select.component';
import { FormTextareaComponent } from '../../shared/form-textarea/form-textarea.component';
import { FormToggleComponent } from '../../shared/form-toggle/form-toggle.component';
import { ButtonComponent } from '../../shared/button/button.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { ConfirmationModalComponent } from '../../shared/confirmation-modal/confirmation-modal.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';

@Component({
  selector: 'app-leave-policy',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FormInputComponent,
    FormSelectComponent,
    FormTextareaComponent,
    FormToggleComponent,
    ButtonComponent,
    StatusBadgeComponent,
    ConfirmationModalComponent,
    EmptyStateComponent,
    SpinnerComponent
  ],
  templateUrl: './leave-policy.component.html',
  styleUrl: './leave-policy.component.css'
})
export class LeavePolicyComponent implements OnInit {
  private leaveService = inject(LeaveService);
  private alertService = inject(AlertService);

  policies: any[] = [];
  loading = false;
  isModalOpen = false;
  isEditMode = false;
  showDeleteConfirmModal = false;
  deleting = false;

  deleteConfirmConfig = {
    title: 'Delete Leave Policy',
    message: '',
    policyId: 0,
    onConfirm: () => {}
  };

  policyForm: any = {
    name: '',
    code: '',
    description: '',
    paidLeave: true,
    daysPerYear: 0,
    maxDaysPerRequest: null,
    minDaysPerRequest: 1,
    accrualEnabled: false,
    accrualFrequency: 'monthly',
    accrualRate: 0,
    proRateEnabled: false,
    carryOverEnabled: false,
    maxCarryOverDays: 0,
    requireDocumentation: false,
    minDocumentationDays: 3,
    noticeRequired: true,
    noticeDays: 3,
    eligibilityCriteria: {
      minTenureMonths: 0,
      roles: [],
      departments: [],
      employmentTypes: []
    },
    restrictions: {
      blackoutDates: [],
      maxConsecutiveDays: null,
      weekendIncluded: true,
      holidayIncluded: false
    },
    isActive: true
  };

  roles = ['employee', 'manager', 'hr', 'admin', 'super-admin', 'accountant'];
  employmentTypes = ['full-time', 'part-time', 'contract', 'intern'];
  accrualFrequencies = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  departments: any[] = [];
  selectedRoles: string[] = [];
  selectedDepartments: string[] = [];
  selectedEmploymentTypes: string[] = [];

  ngOnInit() {
    console.log('=== Leave Policy Component Initialized ===');
    console.log('Token:', localStorage.getItem('token'));
    console.log('User:', localStorage.getItem('user'));
    
    this.loadPolicies();
    this.loadDepartments();
  }

  loadPolicies() {
    this.loading = true;
    this.leaveService.getAllPolicies().subscribe({
      next: (response: any) => {
        this.policies = response.policies || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading policies:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.error?.message || error.message);
        const errorMsg = error.error?.message || error.message || 'Failed to load leave policies';
        this.alertService.showAlert('error', `Error (${error.status})`, errorMsg);
        this.loading = false;
      }
    });
  }

  loadDepartments() {
    // Load departments from your department service
    // For now, we'll use placeholder
    this.departments = [];
  }

  openCreateModal() {
    this.isEditMode = false;
    this.resetForm();
    this.isModalOpen = true;
  }

  openEditModal(policy: any) {
    this.isEditMode = true;
    this.policyForm = {
      id: policy.id,
      name: policy.name,
      code: policy.code,
      description: policy.description,
      paidLeave: policy.paidLeave,
      daysPerYear: policy.daysPerYear,
      maxDaysPerRequest: policy.maxDaysPerRequest,
      minDaysPerRequest: policy.minDaysPerRequest,
      accrualEnabled: policy.accrualEnabled,
      accrualFrequency: policy.accrualFrequency,
      accrualRate: policy.accrualRate,
      proRateEnabled: policy.proRateEnabled,
      carryOverEnabled: policy.carryOverEnabled,
      maxCarryOverDays: policy.maxCarryOverDays,
      requireDocumentation: policy.requireDocumentation,
      minDocumentationDays: policy.minDocumentationDays,
      noticeRequired: policy.noticeRequired,
      noticeDays: policy.noticeDays,
      eligibilityCriteria: { ...policy.eligibilityCriteria },
      restrictions: { ...policy.restrictions },
      isActive: policy.isActive
    };
    this.selectedRoles = policy.eligibilityCriteria?.roles || [];
    this.selectedDepartments = policy.eligibilityCriteria?.departments || [];
    this.selectedEmploymentTypes = policy.eligibilityCriteria?.employmentTypes || [];
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetForm();
  }

  resetForm() {
    this.policyForm = {
      name: '',
      code: '',
      description: '',
      paidLeave: true,
      daysPerYear: 0,
      maxDaysPerRequest: null,
      minDaysPerRequest: 1,
      accrualEnabled: false,
      accrualFrequency: 'monthly',
      accrualRate: 0,
      proRateEnabled: false,
      carryOverEnabled: false,
      maxCarryOverDays: 0,
      requireDocumentation: false,
      minDocumentationDays: 3,
      noticeRequired: true,
      noticeDays: 3,
      eligibilityCriteria: {
        minTenureMonths: 0,
        roles: [],
        departments: [],
        employmentTypes: []
      },
      restrictions: {
        blackoutDates: [],
        maxConsecutiveDays: null,
        weekendIncluded: true,
        holidayIncluded: false
      },
      isActive: true
    };
    this.selectedRoles = [];
    this.selectedDepartments = [];
    this.selectedEmploymentTypes = [];
  }

  onRoleToggle(role: string) {
    const index = this.selectedRoles.indexOf(role);
    if (index > -1) {
      this.selectedRoles.splice(index, 1);
    } else {
      this.selectedRoles.push(role);
    }
  }

  onDepartmentToggle(deptId: string) {
    const index = this.selectedDepartments.indexOf(deptId);
    if (index > -1) {
      this.selectedDepartments.splice(index, 1);
    } else {
      this.selectedDepartments.push(deptId);
    }
  }

  onEmploymentTypeToggle(type: string) {
    const index = this.selectedEmploymentTypes.indexOf(type);
    if (index > -1) {
      this.selectedEmploymentTypes.splice(index, 1);
    } else {
      this.selectedEmploymentTypes.push(type);
    }
  }

  savePolicy() {
    // Validate form
    if (!this.policyForm.name || !this.policyForm.code) {
      this.alertService.showAlert('error', 'Validation Error', 'Please fill in all required fields');
      return;
    }

    // Update eligibility criteria with selected values
    this.policyForm.eligibilityCriteria.roles = this.selectedRoles;
    this.policyForm.eligibilityCriteria.departments = this.selectedDepartments;
    this.policyForm.eligibilityCriteria.employmentTypes = this.selectedEmploymentTypes;

    this.loading = true;

    if (this.isEditMode) {
      this.leaveService.updatePolicy(this.policyForm.id, this.policyForm).subscribe({
        next: (response: any) => {
          this.alertService.showAlert('success', 'Success', 'Leave policy updated successfully');
          this.loadPolicies();
          this.closeModal();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error updating policy:', error);
          this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to update leave policy');
          this.loading = false;
        }
      });
    } else {
      this.leaveService.createPolicy(this.policyForm).subscribe({
        next: (response: any) => {
          this.alertService.showAlert('success', 'Success', 'Leave policy created successfully');
          this.loadPolicies();
          this.closeModal();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error creating policy:', error);
          this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to create leave policy');
          this.loading = false;
        }
      });
    }
  }

  openDeleteConfirmModal(policy: any) {
    this.deleteConfirmConfig = {
      title: 'Delete Leave Policy',
      message: `Are you sure you want to delete "${policy.name}"? This action cannot be undone.`,
      policyId: policy.id,
      onConfirm: () => this.confirmDelete(policy.id)
    };
    this.showDeleteConfirmModal = true;
  }

  confirmDelete(policyId: number) {
    this.deleting = true;
    this.leaveService.deletePolicy(policyId).subscribe({
      next: (response: any) => {
        this.alertService.showAlert('success', 'Success', 'Leave policy deleted successfully');
        this.loadPolicies();
        this.showDeleteConfirmModal = false;
        this.deleting = false;
      },
      error: (error) => {
        console.error('Error deleting policy:', error);
        this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to delete leave policy');
        this.deleting = false;
      }
    });
  }

  togglePolicyStatus(policy: any) {
    const updatedPolicy = { ...policy, isActive: !policy.isActive };
    this.leaveService.updatePolicy(policy.id, updatedPolicy).subscribe({
      next: (response: any) => {
        this.alertService.showAlert('success', 'Success', `Policy ${updatedPolicy.isActive ? 'activated' : 'deactivated'} successfully`);
        this.loadPolicies();
      },
      error: (error) => {
        console.error('Error updating policy status:', error);
        this.alertService.showAlert('error', 'Error', 'Failed to update policy status');
      }
    });
  }

  getStatusBadgeType(isActive: boolean): 'success' | 'default' {
    return isActive ? 'success' : 'default';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }
}
