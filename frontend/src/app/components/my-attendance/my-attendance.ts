import { AlertService } from '../../services/alert.service';
import { ModalService } from '../../services/modal.service';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-my-attendance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-attendance.html',
  styleUrl: './my-attendance.css',
})
export class MyAttendanceComponent implements OnInit, OnDestroy {
  private alertService = inject(AlertService);
  user: any;
  attendanceLogs: any[] = [];
  todayStatus: any = null;
  loading = false;
  Math = Math; // For template usage

  // Real-time clock
  currentTime: string = '';
  currentDate: string = '';
  private clockInterval: any;

  // Pagination
  currentPage = 1;
  pageSize = 10;

  get paginatedAttendance(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.attendanceLogs.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.attendanceLogs.length / this.pageSize) || 1;
  }

  goToPage(page: number) {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
  }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private modalService: ModalService
  ) {}

  ngOnInit() {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    
    this.authService.user$.subscribe((u) => {
      this.user = u;
      if (this.user) {
        this.loadMyAttendance();
      }
    });
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  updateClock() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
    this.currentDate = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  loadMyAttendance() {
    this.loading = true;
    this.attendanceService.getMyAttendance().subscribe({
      next: (logs: any) => {
        this.attendanceLogs = logs.reverse();
        const today = new Date().toISOString().split('T')[0];
        this.todayStatus = this.attendanceLogs.find((l) => l.date === today);
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  async clockIn() {
    await this.modalService.confirm(
      'Clock In',
      'Confirm you are starting your work day?',
      () => {
        this.loading = true;
        this.attendanceService.clockIn().subscribe({
          next: () => {
            this.loadMyAttendance();
            this.modalService.success(
              'Clocked In',
              `Welcome! You clocked in at ${new Date().toLocaleTimeString()}.`
            );
          },
          error: (err) => {
            this.modalService.error(
              'Clock In Failed',
              err.error?.message || 'Could not clock in. Please try again.'
            );
            this.loading = false;
          },
        });
      },
      'Clock In',
      'Cancel'
    );
  }

  async clockOut() {
    await this.modalService.confirm(
      'Clock Out',
      'Confirm you are ending your work day?',
      () => {
        this.loading = true;
        this.attendanceService.clockOut().subscribe({
          next: () => {
            this.loadMyAttendance();
            this.modalService.success(
              'Clocked Out',
              `You clocked out at ${new Date().toLocaleTimeString()}.`
            );
          },
          error: (err) => {
            this.modalService.error(
              'Clock Out Failed',
              err.error?.message || 'Could not clock out. Please try again.'
            );
            this.loading = false;
          },
        });
      },
      'Clock Out',
      'Cancel'
    );
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

  calculateTotalHours(): string {
    let totalMinutes = 0;
    this.attendanceLogs.forEach((log) => {
      if (log.clockIn && log.clockOut) {
        const inTime = new Date(log.clockIn).getTime();
        const outTime = new Date(log.clockOut).getTime();
        const diffMs = outTime - inTime;
        totalMinutes += diffMs / (1000 * 60);
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    return `${hours}h`;
  }

  getActiveSessionDuration(): string {
    if (!this.todayStatus || !this.todayStatus.clockIn || this.todayStatus.clockOut) {
      return '0h 0m';
    }
    const now = new Date().getTime();
    const clockInTime = new Date(this.todayStatus.clockIn).getTime();
    const diffMs = now - clockInTime;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  getMonthlyStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const monthlyLogs = this.attendanceLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
    });

    let totalMinutes = 0;
    let onTimeDays = 0;
    
    monthlyLogs.forEach(log => {
      if (log.clockIn && log.clockOut) {
        const inTime = new Date(log.clockIn).getTime();
        const outTime = new Date(log.clockOut).getTime();
        totalMinutes += (outTime - inTime) / (1000 * 60);
      }
      
      if (!this.isLate(log.clockIn)) {
        onTimeDays++;
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const avgHoursPerDay = monthlyLogs.length > 0 ? (totalHours / monthlyLogs.length).toFixed(1) : '0.0';
    const onTimeRate = monthlyLogs.length > 0 ? Math.round((onTimeDays / monthlyLogs.length) * 100) : 100;

    return {
      daysPresent: monthlyLogs.length,
      totalHours: `${totalHours}h`,
      onTimeRate: onTimeRate,
      avgHoursPerDay: avgHoursPerDay + 'h'
    };
  }

  getWeekRange(): string {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  getWeekDays() {
    const days = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      const log = this.attendanceLogs.find(l => l.date === dateStr);
      
      days.push({
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
        date: day.getDate(),
        isToday: dateStr === now.toISOString().split('T')[0],
        isFuture: day > now,
        hasAttendance: !!log,
        hours: log ? this.calculateDuration(log.clockIn, log.clockOut) : null
      });
    }

    return days;
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
