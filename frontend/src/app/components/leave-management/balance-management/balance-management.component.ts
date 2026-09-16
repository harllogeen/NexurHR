import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../../services/leave.service';
import { AlertService } from '../../../services/alert.service';
import { ApiService } from '../../../services/api.service';
import { FormInputComponent } from '../../shared/form-input/form-input.component';
import { FormSelectComponent } from '../../shared/form-select/form-select.component';
import { ButtonComponent } from '../../shared/button/button.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { ModalComponent } from '../../shared/modal/modal.component';

interface EmployeeBalance {
  userId: number;
  employeeName: string;
  email: string;
  department: string;
  joiningDate: string;
  balances: {
    leaveType: string;
    leaveTypeLabel: string;
    balance: number;
    accrued: number;
    used: number;
    pending: number;
  }[];
}

interface AdjustmentHistory {
  id: number;
  userId: number;
  employeeName: string;
  leaveType: string;
  leaveTypeLabel: string;
  previousBalance: number;
  newBalance: number;
  adjustedBy: string;
  reason: string;
  adjustedAt: string;
}

@Component({
  selector: 'app-balance-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FormInputComponent,
    FormSelectComponent,
    ButtonComponent,
    StatusBadgeComponent,
    ModalComponent
  ],
  templateUrl: './balance-management.component.html',
  styleUrls: ['./balance-management.component.css']
})
export class BalanceManagementComponent implements OnInit {
  // Data
  allBalances: EmployeeBalance[] = [];
  filteredBalances: EmployeeBalance[] = [];
  adjustmentHistory: AdjustmentHistory[] = [];
  employees: any[] = [];

  // Filters
  departmentFilter: string = '';
  searchQuery: string = '';
  leaveTypeFilter: string = '';

  // Options
  departments: string[] = [];
  departmentOptions: any[] = [];
  leaveTypeOptions = [
    { value: '', label: 'All Leave Types' },
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'casual', label: 'Casual Leave' },
    { value: 'maternity', label: 'Maternity Leave' },
    { value: 'paternity', label: 'Paternity Leave' },
    { value: 'unpaid', label: 'Unpaid Leave' }
  ];

  // Modal states
  showAdjustModal = false;
  showHistoryModal = false;
  showInitializeModal = false;
  showAccrualModal = false;

  // Adjustment form
  selectedEmployee: EmployeeBalance | null = null;
  adjustmentForm = {
    userId: 0,
    leaveType: '',
    newBalance: 0,
    reason: ''
  };

  // Initialize form
  initializeForm = {
    userId: 0,
    joiningDate: ''
  };

  // Loading states
  loading = false;
  adjusting = false;
  initializing = false;
  processingAccrual = false;
  loadingHistory = false;

  // Active view
  activeView: 'balances' | 'history' = 'balances';

  constructor(
    private leaveService: LeaveService,
    private apiService: ApiService,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    this.loadBalances();
    this.loadEmployees();
  }

  loadBalances() {
    this.loading = true;
    this.leaveService.getAllBalances().subscribe({
      next: (response: any) => {
        this.allBalances = response.balances || [];
        this.extractDepartments();
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load balances:', error);
        this.alertService.showAlert('error', 'Failed to load leave balances', error.error?.message || '');
        this.loading = false;
      }
    });
  }

  loadEmployees() {
    this.apiService.get('employees').subscribe({
      next: (response: any) => {
        this.employees = response.employees || response || [];
      },
      error: (error: any) => {
        console.error('Failed to load employees:', error);
      }
    });
  }

  loadAdjustmentHistory() {
    this.loadingHistory = true;
    this.leaveService.getAllAdjustments().subscribe({
      next: (response: any) => {
        this.adjustmentHistory = response.adjustments || [];
        this.loadingHistory = false;
      },
      error: (error) => {
        console.error('Failed to load adjustment history:', error);
        this.alertService.showAlert('error', 'Failed to load adjustment history', error.error?.message || '');
        this.loadingHistory = false;
      }
    });
  }

  extractDepartments() {
    const deptSet = new Set<string>();
    this.allBalances.forEach(emp => {
      if (emp.department) deptSet.add(emp.department);
    });
    this.departments = Array.from(deptSet).sort();
    this.departmentOptions = [
      { value: '', label: 'All Departments' },
      ...this.departments.map(d => ({ value: d, label: d }))
    ];
  }

  applyFilters() {
    let filtered = [...this.allBalances];

    // Department filter
    if (this.departmentFilter) {
      filtered = filtered.filter(emp => emp.department === this.departmentFilter);
    }

    // Leave type filter - filter employees who have this leave type
    if (this.leaveTypeFilter) {
      filtered = filtered.filter(emp =>
        emp.balances.some(b => b.leaveType === this.leaveTypeFilter)
      );
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.employeeName.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query)
      );
    }

    this.filteredBalances = filtered;
  }

  onFilterChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.departmentFilter = '';
    this.searchQuery = '';
    this.leaveTypeFilter = '';
    this.applyFilters();
  }

  switchView(view: 'balances' | 'history') {
    this.activeView = view;
    if (view === 'history' && this.adjustmentHistory.length === 0) {
      this.loadAdjustmentHistory();
    }
  }

  openAdjustModal(employee: EmployeeBalance, leaveType?: string) {
    this.selectedEmployee = employee;
    this.adjustmentForm = {
      userId: employee.userId,
      leaveType: leaveType || '',
      newBalance: 0,
      reason: ''
    };
    this.showAdjustModal = true;
  }

  closeAdjustModal() {
    this.showAdjustModal = false;
    this.selectedEmployee = null;
    this.adjustmentForm = {
      userId: 0,
      leaveType: '',
      newBalance: 0,
      reason: ''
    };
  }

  confirmAdjustment() {
    if (!this.adjustmentForm.leaveType || !this.adjustmentForm.reason.trim()) {
      this.alertService.showAlert('error', 'Missing Information', 'Please fill in all required fields');
      return;
    }

    this.adjusting = true;
    this.leaveService.adjustBalance(
      this.adjustmentForm.userId,
      this.adjustmentForm.leaveType,
      this.adjustmentForm.newBalance,
      this.adjustmentForm.reason
    ).subscribe({
      next: () => {
        this.alertService.showAlert('success', 'Balance Adjusted', 'Leave balance updated successfully');
        this.closeAdjustModal();
        this.loadBalances();
        this.adjusting = false;
      },
      error: (error) => {
        console.error('Failed to adjust balance:', error);
        this.alertService.showAlert('error', 'Adjustment Failed', error.error?.message || '');
        this.adjusting = false;
      }
    });
  }

  openInitializeModal() {
    this.initializeForm = {
      userId: 0,
      joiningDate: ''
    };
    this.showInitializeModal = true;
  }

  closeInitializeModal() {
    this.showInitializeModal = false;
    this.initializeForm = {
      userId: 0,
      joiningDate: ''
    };
  }

  confirmInitialize() {
    if (!this.initializeForm.userId) {
      this.alertService.showAlert('error', 'Missing Information', 'Please select an employee');
      return;
    }

    this.initializing = true;
    this.leaveService.initializeBalance(
      this.initializeForm.userId,
      this.initializeForm.joiningDate || undefined
    ).subscribe({
      next: () => {
        this.alertService.showAlert('success', 'Balance Initialized', 'Leave balance initialized successfully');
        this.closeInitializeModal();
        this.loadBalances();
        this.initializing = false;
      },
      error: (error) => {
        console.error('Failed to initialize balance:', error);
        this.alertService.showAlert('error', 'Initialization Failed', error.error?.message || '');
        this.initializing = false;
      }
    });
  }

  openAccrualModal() {
    this.showAccrualModal = true;
  }

  closeAccrualModal() {
    this.showAccrualModal = false;
  }

  processBulkAccruals() {
    if (!confirm('This will process accruals for all employees. Continue?')) {
      return;
    }

    this.processingAccrual = true;
    this.leaveService.bulkProcessAccruals().subscribe({
      next: (response: any) => {
        this.alertService.showAlert('success', 'Accruals Processed', `Processed accruals for ${response.processed || 0} employees`);
        this.closeAccrualModal();
        this.loadBalances();
        this.processingAccrual = false;
      },
      error: (error) => {
        console.error('Failed to process accruals:', error);
        this.alertService.showAlert('error', 'Accrual Processing Failed', error.error?.message || '');
        this.processingAccrual = false;
      }
    });
  }

  getBalanceStatus(balance: any): 'success' | 'warning' | 'danger' {
    const percentage = (balance.balance / (balance.accrued || 1)) * 100;
    if (percentage > 50) return 'success';
    if (percentage > 20) return 'warning';
    return 'danger';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getEmployeeOptions() {
    return this.employees.map(emp => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.email})`
    }));
  }

  getLeaveTypeOptionsForEmployee(employee: EmployeeBalance | null) {
    if (!employee) return [];
    return employee.balances.map(b => ({
      value: b.leaveType,
      label: b.leaveTypeLabel
    }));
  }

  getCurrentBalance(employee: EmployeeBalance | null, leaveType: string): number {
    if (!employee) return 0;
    const balance = employee.balances.find(b => b.leaveType === leaveType);
    return balance?.balance || 0;
  }
}
