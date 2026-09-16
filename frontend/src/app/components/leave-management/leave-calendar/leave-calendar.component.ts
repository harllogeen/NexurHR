import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeaveService } from '../../../services/leave.service';
import { AlertService } from '../../../services/alert.service';
import { FormSelectComponent } from '../../shared/form-select/form-select.component';
import { ButtonComponent } from '../../shared/button/button.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { ModalComponent } from '../../shared/modal/modal.component';
import { getLeaveStatusVariant } from '../../../utils/status.util';

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  leaves: LeaveEntry[];
}

interface LeaveEntry {
  id: number;
  employeeName: string;
  department: string;
  leaveType: string;
  leaveTypeLabel: string;
  status: 'pending' | 'approved' | 'rejected';
  isFullDay: boolean;
  isStartDate?: boolean;
  isEndDate?: boolean;
}

@Component({
  selector: 'app-leave-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FormSelectComponent,
    ButtonComponent,
    StatusBadgeComponent,
    ModalComponent
  ],
  templateUrl: './leave-calendar.component.html',
  styleUrls: ['./leave-calendar.component.css']
})
export class LeaveCalendarComponent implements OnInit {
  // Calendar state
  currentDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Data
  allLeaves: any[] = [];
  filteredLeaves: any[] = [];

  // Filters
  departmentFilter: string = '';
  leaveTypeFilter: string = '';
  statusFilter: string = 'approved';
  viewMode: 'month' | 'week' = 'month';

  // Options
  departments: string[] = [];
  departmentOptions: any[] = [];
  statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'approved', label: 'Approved Only' },
    { value: 'pending', label: 'Pending Only' },
    { value: 'rejected', label: 'Rejected Only' }
  ];
  leaveTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'casual', label: 'Casual Leave' },
    { value: 'maternity', label: 'Maternity Leave' },
    { value: 'paternity', label: 'Paternity Leave' },
    { value: 'unpaid', label: 'Unpaid Leave' }
  ];

  // Modal state
  showDayModal = false;
  selectedDay: CalendarDay | null = null;

  // Loading states
  loading = false;

  constructor(
    private leaveService: LeaveService,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    this.loadLeaves();
  }

  loadLeaves() {
    this.loading = true;
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;

    this.leaveService.getAllLeaves({ year, month }).subscribe({
      next: (response: any) => {
        this.allLeaves = response.leaves || [];
        this.extractDepartments();
        this.applyFilters();
        this.generateCalendar();
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load leaves:', error);
        this.alertService.showAlert('error', 'Failed to load calendar data', error.error?.message || '');
        this.loading = false;
      }
    });
  }

  extractDepartments() {
    const deptSet = new Set<string>();
    this.allLeaves.forEach(leave => {
      if (leave.department) deptSet.add(leave.department);
    });
    this.departments = Array.from(deptSet).sort();
    this.departmentOptions = [
      { value: '', label: 'All Departments' },
      ...this.departments.map(d => ({ value: d, label: d }))
    ];
  }

  applyFilters() {
    let filtered = [...this.allLeaves];

    // Department filter
    if (this.departmentFilter) {
      filtered = filtered.filter(leave => (leave.department || '').toLowerCase() === this.departmentFilter.toLowerCase());
    }

    // Leave type filter
    if (this.leaveTypeFilter) {
      filtered = filtered.filter(leave => (leave.leaveType || '').toLowerCase() === this.leaveTypeFilter.toLowerCase());
    }

    // Status filter
    if (this.statusFilter && this.statusFilter !== 'all') {
      filtered = filtered.filter(leave => (leave.status || '').toLowerCase() === this.statusFilter.toLowerCase());
    }

    this.filteredLeaves = filtered;
    this.generateCalendar();
  }

  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];

    // Add previous month days
    const firstDayOfWeek = firstDay.getDay();
    if (firstDayOfWeek > 0) {
      const prevMonthLastDay = new Date(year, month, 0);
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, prevMonthLastDay.getDate() - i);
        days.push(this.createCalendarDay(date, false));
      }
    }

    // Add current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push(this.createCalendarDay(date, true));
    }

    // Add next month days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push(this.createCalendarDay(date, false));
    }

    this.calendarDays = days;
  }

  createCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(date);
    dayDate.setHours(0, 0, 0, 0);

    return {
      date: new Date(date),
      dayNumber: date.getDate(),
      isCurrentMonth,
      isToday: dayDate.getTime() === today.getTime(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      leaves: this.getLeavesForDate(date)
    };
  }

  getLeavesForDate(date: Date): LeaveEntry[] {
    const dateStr = date.toISOString().split('T')[0];
    const leaves: LeaveEntry[] = [];

    this.filteredLeaves.forEach(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      if (date >= startDate && date <= endDate) {
        leaves.push({
          id: leave.id,
          employeeName: leave.employeeName || 'Unknown',
          department: leave.department || '',
          leaveType: leave.leaveType,
          leaveTypeLabel: leave.leaveTypeLabel || leave.leaveType,
          status: leave.status,
          isFullDay: true,
          isStartDate: date.getTime() === startDate.getTime(),
          isEndDate: date.getTime() === endDate.getTime()
        });
      }
    });

    return leaves;
  }

  onFilterChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.departmentFilter = '';
    this.leaveTypeFilter = '';
    this.statusFilter = 'approved';
    this.applyFilters();
  }

  previousMonth() {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
    this.loadLeaves();
  }

  nextMonth() {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
    this.loadLeaves();
  }

  goToToday() {
    this.currentDate = new Date();
    this.loadLeaves();
  }

  openDayModal(day: CalendarDay) {
    if (day.leaves.length > 0) {
      this.selectedDay = day;
      this.showDayModal = true;
    }
  }

  closeDayModal() {
    this.showDayModal = false;
    this.selectedDay = null;
  }

  getMonthYear(): string {
    return `${this.monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  getLeaveTypeColor(leaveType: string): string {
    const colors: { [key: string]: string } = {
      'annual': '#3b82f6',
      'sick': '#ef4444',
      'casual': '#8b5cf6',
      'maternity': '#ec4899',
      'paternity': '#06b6d4',
      'unpaid': '#6b7280'
    };
    return colors[leaveType] || '#6b7280';
  }

  getStatusBadgeType(status: string) {
    return getLeaveStatusVariant(status);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  getTotalLeavesCount(): number {
    return this.calendarDays.reduce((sum, day) => sum + day.leaves.length, 0);
  }

  getEmployeesOnLeaveToday(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDay = this.calendarDays.find(day => {
      const dayDate = new Date(day.date);
      dayDate.setHours(0, 0, 0, 0);
      return dayDate.getTime() === today.getTime();
    });
    return todayDay ? new Set(todayDay.leaves.map(l => l.employeeName)).size : 0;
  }
}
