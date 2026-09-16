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

interface ApprovalLevel {
  level: number;
  approverType: string;
  approverRole?: string;
  specificApprover?: string;
  requireAll: boolean;
}

@Component({
  selector: 'app-approval-workflow',
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
  templateUrl: './approval-workflow.component.html',
  styleUrl: './approval-workflow.component.css'
})
export class ApprovalWorkflowComponent implements OnInit {
  private leaveService = inject(LeaveService);
  private alertService = inject(AlertService);

  workflows: any[] = [];
  loading = false;
  isModalOpen = false;
  isEditMode = false;
  showDeleteConfirmModal = false;
  deleting = false;

  deleteConfirmConfig = {
    title: 'Delete Approval Workflow',
    message: '',
    workflowId: 0,
    onConfirm: () => {}
  };

  workflowForm: any = {
    name: '',
    description: '',
    conditions: {
      leaveTypes: [],
      departments: [],
      roles: [],
      minDays: null,
      maxDays: null,
      employmentTypes: [],
      grades: []
    },
    approvalLevels: [
      {
        level: 1,
        approverType: 'manager',
        approverRole: '',
        specificApprover: '',
        requireAll: false
      }
    ],
    isDefault: false,
    isActive: true
  };

  approverTypes = [
    { value: 'manager', label: 'Direct Manager' },
    { value: 'department_head', label: 'Department Head' },
    { value: 'hr', label: 'HR Department' },
    { value: 'role', label: 'Specific Role' },
    { value: 'user', label: 'Specific User' }
  ];

  roles = ['employee', 'manager', 'hr', 'admin', 'super-admin', 'accountant'];
  employmentTypes = ['full-time', 'part-time', 'contract', 'intern'];

  leaveTypes: any[] = [];
  departments: any[] = [];

  selectedLeaveTypes: string[] = [];
  selectedDepartments: string[] = [];
  selectedRoles: string[] = [];
  selectedEmploymentTypes: string[] = [];

  ngOnInit() {
    this.loadWorkflows();
    this.loadLeaveTypes();
    this.loadDepartments();
  }

  loadWorkflows() {
    this.loading = true;
    this.leaveService.getAllWorkflows().subscribe({
      next: (response: any) => {
        this.workflows = response.workflows || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading workflows:', error);
        this.alertService.showAlert('error', 'Error', 'Failed to load approval workflows');
        this.loading = false;
      }
    });
  }

  loadLeaveTypes() {
    this.leaveService.getActivePolicies().subscribe({
      next: (response: any) => {
        this.leaveTypes = (response.policies || []).map((p: any) => ({
          value: p.code,
          label: p.name
        }));
      },
      error: (error) => {
        console.error('Error loading leave types:', error);
      }
    });
  }

  loadDepartments() {
    // Load departments from your department service
    // For now, we'll use placeholder
    this.departments = [
      { value: 'IT', label: 'IT' },
      { value: 'HR', label: 'HR' },
      { value: 'Finance', label: 'Finance' },
      { value: 'Operations', label: 'Operations' }
    ];
  }

  openCreateModal() {
    this.isEditMode = false;
    this.resetForm();
    this.isModalOpen = true;
  }

  openEditModal(workflow: any) {
    this.isEditMode = true;
    this.workflowForm = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      conditions: { ...workflow.conditions },
      approvalLevels: JSON.parse(JSON.stringify(workflow.approvalLevels)),
      isDefault: workflow.isDefault,
      isActive: workflow.isActive
    };
    this.selectedLeaveTypes = workflow.conditions?.leaveTypes || [];
    this.selectedDepartments = workflow.conditions?.departments || [];
    this.selectedRoles = workflow.conditions?.roles || [];
    this.selectedEmploymentTypes = workflow.conditions?.employmentTypes || [];
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.resetForm();
  }

  resetForm() {
    this.workflowForm = {
      name: '',
      description: '',
      conditions: {
        leaveTypes: [],
        departments: [],
        roles: [],
        minDays: null,
        maxDays: null,
        employmentTypes: [],
        grades: []
      },
      approvalLevels: [
        {
          level: 1,
          approverType: 'manager',
          approverRole: '',
          specificApprover: '',
          requireAll: false
        }
      ],
      isDefault: false,
      isActive: true
    };
    this.selectedLeaveTypes = [];
    this.selectedDepartments = [];
    this.selectedRoles = [];
    this.selectedEmploymentTypes = [];
  }

  onLeaveTypeToggle(type: string) {
    const index = this.selectedLeaveTypes.indexOf(type);
    if (index > -1) {
      this.selectedLeaveTypes.splice(index, 1);
    } else {
      this.selectedLeaveTypes.push(type);
    }
  }

  onDepartmentToggle(dept: string) {
    const index = this.selectedDepartments.indexOf(dept);
    if (index > -1) {
      this.selectedDepartments.splice(index, 1);
    } else {
      this.selectedDepartments.push(dept);
    }
  }

  onRoleToggle(role: string) {
    const index = this.selectedRoles.indexOf(role);
    if (index > -1) {
      this.selectedRoles.splice(index, 1);
    } else {
      this.selectedRoles.push(role);
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

  addApprovalLevel() {
    const newLevel: ApprovalLevel = {
      level: this.workflowForm.approvalLevels.length + 1,
      approverType: 'manager',
      approverRole: '',
      specificApprover: '',
      requireAll: false
    };
    this.workflowForm.approvalLevels.push(newLevel);
  }

  removeApprovalLevel(index: number) {
    if (this.workflowForm.approvalLevels.length > 1) {
      this.workflowForm.approvalLevels.splice(index, 1);
      // Renumber levels
      this.workflowForm.approvalLevels.forEach((level: ApprovalLevel, idx: number) => {
        level.level = idx + 1;
      });
    }
  }

  moveApprovalLevelUp(index: number) {
    if (index > 0) {
      const temp = this.workflowForm.approvalLevels[index];
      this.workflowForm.approvalLevels[index] = this.workflowForm.approvalLevels[index - 1];
      this.workflowForm.approvalLevels[index - 1] = temp;
      // Renumber levels
      this.workflowForm.approvalLevels.forEach((level: ApprovalLevel, idx: number) => {
        level.level = idx + 1;
      });
    }
  }

  moveApprovalLevelDown(index: number) {
    if (index < this.workflowForm.approvalLevels.length - 1) {
      const temp = this.workflowForm.approvalLevels[index];
      this.workflowForm.approvalLevels[index] = this.workflowForm.approvalLevels[index + 1];
      this.workflowForm.approvalLevels[index + 1] = temp;
      // Renumber levels
      this.workflowForm.approvalLevels.forEach((level: ApprovalLevel, idx: number) => {
        level.level = idx + 1;
      });
    }
  }

  saveWorkflow() {
    if (!this.workflowForm.name) {
      this.alertService.showAlert('error', 'Validation Error', 'Please enter a workflow name');
      return;
    }

    if (this.workflowForm.approvalLevels.length === 0) {
      this.alertService.showAlert('error', 'Validation Error', 'Please add at least one approval level');
      return;
    }

    // Update conditions with selected values
    this.workflowForm.conditions.leaveTypes = this.selectedLeaveTypes;
    this.workflowForm.conditions.departments = this.selectedDepartments;
    this.workflowForm.conditions.roles = this.selectedRoles;
    this.workflowForm.conditions.employmentTypes = this.selectedEmploymentTypes;

    this.loading = true;

    if (this.isEditMode) {
      this.leaveService.updateWorkflow(this.workflowForm.id, this.workflowForm).subscribe({
        next: (response: any) => {
          this.alertService.showAlert('success', 'Success', 'Workflow updated successfully');
          this.loadWorkflows();
          this.closeModal();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error updating workflow:', error);
          this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to update workflow');
          this.loading = false;
        }
      });
    } else {
      this.leaveService.createWorkflow(this.workflowForm).subscribe({
        next: (response: any) => {
          this.alertService.showAlert('success', 'Success', 'Workflow created successfully');
          this.loadWorkflows();
          this.closeModal();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error creating workflow:', error);
          this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to create workflow');
          this.loading = false;
        }
      });
    }
  }

  openDeleteConfirmModal(workflow: any) {
    this.deleteConfirmConfig = {
      title: 'Delete Approval Workflow',
      message: `Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`,
      workflowId: workflow.id,
      onConfirm: () => this.confirmDelete(workflow.id)
    };
    this.showDeleteConfirmModal = true;
  }

  confirmDelete(workflowId: number) {
    this.deleting = true;
    this.leaveService.deleteWorkflow(workflowId).subscribe({
      next: (response: any) => {
        this.alertService.showAlert('success', 'Success', 'Workflow deleted successfully');
        this.loadWorkflows();
        this.showDeleteConfirmModal = false;
        this.deleting = false;
      },
      error: (error) => {
        console.error('Error deleting workflow:', error);
        this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to delete workflow');
        this.deleting = false;
      }
    });
  }

  toggleWorkflowStatus(workflow: any) {
    const updatedWorkflow = { ...workflow, isActive: !workflow.isActive };
    this.leaveService.updateWorkflow(workflow.id, updatedWorkflow).subscribe({
      next: (response: any) => {
        this.alertService.showAlert('success', 'Success', `Workflow ${updatedWorkflow.isActive ? 'activated' : 'deactivated'} successfully`);
        this.loadWorkflows();
      },
      error: (error) => {
        console.error('Error updating workflow status:', error);
        this.alertService.showAlert('error', 'Error', 'Failed to update workflow status');
      }
    });
  }

  getApproverTypeLabel(type: string): string {
    const found = this.approverTypes.find(t => t.value === type);
    return found ? found.label : type;
  }

  getConditionsSummary(workflow: any): string {
    const conditions = [];
    if (workflow.conditions?.leaveTypes?.length) {
      conditions.push(`${workflow.conditions.leaveTypes.length} leave types`);
    }
    if (workflow.conditions?.departments?.length) {
      conditions.push(`${workflow.conditions.departments.length} departments`);
    }
    if (workflow.conditions?.minDays || workflow.conditions?.maxDays) {
      const range = [];
      if (workflow.conditions.minDays) range.push(`min ${workflow.conditions.minDays}`);
      if (workflow.conditions.maxDays) range.push(`max ${workflow.conditions.maxDays}`);
      conditions.push(range.join(', ') + ' days');
    }
    return conditions.length > 0 ? conditions.join(' • ') : 'No specific conditions';
  }

  getStatusBadgeType(isActive: boolean): 'success' | 'default' {
    return isActive ? 'success' : 'default';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Active' : 'Inactive';
  }
}
