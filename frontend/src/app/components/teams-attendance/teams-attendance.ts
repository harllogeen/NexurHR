import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { AlertService } from '../../services/alert.service';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-teams-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teams-attendance.html',
  styleUrl: './teams-attendance.css',
})
export class TeamsAttendanceComponent implements OnInit {
  private alertService = inject(AlertService);
  user: any;
  allAttendanceLogs: any[] = [];
  todayStats: any = { present: 0, late: 0, absent: 0, total: 0 };
  loading = false;
  Math = Math; // For template usage

  // Date Filter
  filterDate: string = ''; // Date input value
  appliedFilterDate: string = ''; // Actually applied filter date

  // Pagination - Server-side
  currentPage = 1;
  pageSize = 20; // Increased for better performance with large datasets
  totalRecords = 0;
  totalPages = 1;

  // Filters
  searchTerm = '';
  selectedDepartment = '';
  selectedStatus = '';
  startDate = '';
  endDate = '';

  get paginatedAttendance(): any[] {
    // Server-side pagination - return data as-is from backend
    return this.allAttendanceLogs;
  }

  goToPage(page: number) {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
    this.loadAllAttendance();
  }

  getPageNumbers(): number[] {
    const maxVisiblePages = 5;
    const pages: number[] = [];
    
    if (this.totalPages <= maxVisiblePages) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }
    
    // Show pages around current page
    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(this.totalPages, this.currentPage + 2);
    
    if (this.currentPage <= 3) {
      endPage = maxVisiblePages;
    }
    
    if (this.currentPage > this.totalPages - 3) {
      startPage = this.totalPages - maxVisiblePages + 1;
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  onSearch() {
    this.currentPage = 1; // Reset to first page on search
    this.loadAllAttendance();
  }

  onFilterChange() {
    this.currentPage = 1; // Reset to first page on filter change
    this.loadAllAttendance();
  }

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private router: Router,
    private modalService: ModalService
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe((u) => {
      this.user = u;
      if (this.user) {
        // Check if user is HR
        if (this.user.role !== 'hr') {
          this.alertService.showAlert('error', 'Access Denied', 'You do not have permission to view this page');
          this.router.navigate(['/dashboard/my-attendance']);
          return;
        }
        // Set today as default
        this.setToday();
      }
    });
  }

  setToday() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.filterDate = `${year}-${month}-${day}`;
    this.applyDateFilter();
  }

  clearDateFilter() {
    this.filterDate = '';
    this.appliedFilterDate = '';
    this.loadDateStats();
    this.loadAllAttendance();
  }

  applyDateFilter() {
    this.appliedFilterDate = this.filterDate;
    this.currentPage = 1; // Reset to first page when filtering
    this.loadDateStats();
    this.loadAllAttendance();
  }

  getDateLabel(): string {
    if (!this.appliedFilterDate) {
      return 'All Time';
    }
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    if (this.appliedFilterDate === todayStr) {
      return 'Today';
    }
    
    const selectedDate = new Date(this.appliedFilterDate + 'T00:00:00');
    return selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  loadDateStats() {
    // Get the date to load stats for (applied filter date or all time)
    let dateStr: string;
    
    if (this.appliedFilterDate) {
      dateStr = this.appliedFilterDate;
    } else {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }
    
    console.log('Loading stats for date:', dateStr);
    
    // Load attendance for the selected date without pagination
    this.attendanceService.getAllAttendance({
      startDate: dateStr,
      endDate: dateStr,
      limit: 1000 // Large limit to get all records for this date
    }).subscribe({
      next: (response: any) => {
        const dateLogs = response.data || response || [];
        console.log('Attendance logs for selected date:', dateLogs);
        
        let present = 0;
        let late = 0;
        
        dateLogs.forEach((log: any) => {
          if (log.clockIn) {
            if (this.isLate(log.clockIn)) {
              late++;
            } else {
              present++;
            }
          }
        });
        
        this.todayStats = {
          present: present,
          late: late,
          absent: 0, // Calculate based on expected employees if needed
          total: dateLogs.length
        };
        
        console.log('Calculated stats:', this.todayStats);
      },
      error: (err) => {
        console.error('Error loading date stats:', err);
        // Keep default zeros if error
        this.todayStats = { present: 0, late: 0, absent: 0, total: 0 };
      }
    });
  }

  loadAllAttendance() {
    this.loading = true;
    
    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
      search: this.searchTerm || undefined,
      department: this.selectedDepartment || undefined,
      status: this.selectedStatus || undefined,
    };
    
    // Add date filter if applied
    if (this.appliedFilterDate) {
      params.startDate = this.appliedFilterDate;
      params.endDate = this.appliedFilterDate;
    } else {
      // If no date filter, use existing date range filters if set
      params.startDate = this.startDate || undefined;
      params.endDate = this.endDate || undefined;
    }
    
    // Remove undefined values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });
    
    this.attendanceService.getAllAttendance(params).subscribe({
      next: (response: any) => {
        if (response.data) {
          // Server-side pagination response
          this.allAttendanceLogs = response.data;
          this.totalRecords = response.pagination.totalRecords;
          this.totalPages = response.pagination.totalPages;
          this.currentPage = response.pagination.currentPage;
        } else {
          // Fallback for old API response format
          this.allAttendanceLogs = response;
          this.totalRecords = response.length;
          this.totalPages = Math.ceil(response.length / this.pageSize);
        }
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.alertService.showAlert('error', 'Error', 'Failed to load team attendance');
      },
    });
  }

  calculateDuration(clockIn: string, clockOut: string): string {
    if (!clockIn || !clockOut) {
      return '—';
    }
    const inTime = new Date(clockIn).getTime();
    const outTime = new Date(clockOut).getTime();
    const diffMs = outTime - inTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  getTeamStats() {
    return this.todayStats;
  }

  isLate(clockInTime: string): boolean {
    if (!clockInTime) return false;
    const clockIn = new Date(clockInTime);
    const hours = clockIn.getHours();
    const minutes = clockIn.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const standardStart = 8 * 60; // 8:00 AM in minutes
    return totalMinutes > standardStart;
  }

  isEarlyDeparture(clockOutTime: string): boolean {
    if (!clockOutTime) return false;
    const clockOut = new Date(clockOutTime);
    const hours = clockOut.getHours();
    const minutes = clockOut.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const standardEnd = 17 * 60; // 5:00 PM in minutes
    return totalMinutes < standardEnd;
  }

  getLateMinutes(clockInTime: string): string {
    if (!clockInTime) return '';
    const clockIn = new Date(clockInTime);
    const hours = clockIn.getHours();
    const minutes = clockIn.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const standardStart = 8 * 60;
    const lateBy = totalMinutes - standardStart;
    
    if (lateBy <= 0) return '';
    
    const lateHours = Math.floor(lateBy / 60);
    const lateMins = lateBy % 60;
    
    if (lateHours > 0) {
      return `${lateHours}h ${lateMins}m`;
    }
    return `${lateMins}m`;
  }

  getEarlyMinutes(clockOutTime: string): string {
    if (!clockOutTime) return '';
    const clockOut = new Date(clockOutTime);
    const hours = clockOut.getHours();
    const minutes = clockOut.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const standardEnd = 17 * 60;
    const earlyBy = standardEnd - totalMinutes;
    
    if (earlyBy <= 0) return '';
    
    const earlyHours = Math.floor(earlyBy / 60);
    const earlyMins = earlyBy % 60;
    
    if (earlyHours > 0) {
      return `${earlyHours}h ${earlyMins}m`;
    }
    return `${earlyMins}m`;
  }

  getStatusText(clockInTime: string, clockOutTime: string): string {
    const late = this.isLate(clockInTime);
    const early = clockOutTime ? this.isEarlyDeparture(clockOutTime) : false;
    
    if (late && early) {
      return 'Late & Left Early';
    } else if (late) {
      return 'Late Arrival';
    } else if (early) {
      return 'Left Early';
    }
    return 'On Time';
  }
}
