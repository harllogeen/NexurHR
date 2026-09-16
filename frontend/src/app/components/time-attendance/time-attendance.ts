import { AlertService } from '../../services/alert.service';
import { ModalService } from '../../services/modal.service';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceService } from '../../services/attendance.service';
import { AuthService } from '../../services/auth.service';
// Import Reusable Components
import { ButtonComponent } from '../shared/button/button.component';

@Component({
 selector: 'app-time-attendance',
 standalone: true,
 imports: [CommonModule, FormsModule, ButtonComponent],
 templateUrl: './time-attendance.html',
 styleUrl: './time-attendance.css',
})
export class TimeAttendance implements OnInit, OnDestroy {
  private alertService = inject(AlertService);
 user: any;
 attendanceLogs: any[] = [];
 allAttendanceLogs: any[] = [];
 filteredAttendanceLogs: any[] = [];
 todayStatus: any = null;
 loading = false;

 // Filters
 selectedDate: string = '';
 searchTerm: string = '';
 filterDepartment: string = '';
 filterStatus: string = '';

 // Real-time clock
 currentTime: string = '';
 currentDate: string = '';
 private clockInterval: any;

 // Pagination
 myAttendancePage = 1;
 allAttendancePage = 1;
 pageSize = 10;

 get paginatedMyAttendance(): any[] {
 const start = (this.myAttendancePage - 1) * this.pageSize;
 return this.attendanceLogs.slice(start, start + this.pageSize);
 }

 get myAttendanceTotalPages(): number {
 return Math.ceil(this.attendanceLogs.length / this.pageSize) || 1;
 }

 get paginatedAllAttendance(): any[] {
 const start = (this.allAttendancePage - 1) * this.pageSize;
 return this.filteredAttendanceLogs.slice(start, start + this.pageSize);
 }

 get allAttendanceTotalPages(): number {
 return Math.ceil(this.filteredAttendanceLogs.length / this.pageSize) || 1;
 }

 goToPage(table: 'my' | 'all', page: number) {
 if (table === 'my') {
 this.myAttendancePage = Math.max(1, Math.min(page, this.myAttendanceTotalPages));
 } else {
 this.allAttendancePage = Math.max(1, Math.min(page, this.allAttendanceTotalPages));
 }
 }

 getPageNumbers(totalPages: number): number[] {
 return Array.from({ length: totalPages }, (_, i) => i + 1);
 }

 constructor(
 private attendanceService: AttendanceService,
 private authService: AuthService,
 private modalService: ModalService
 ) {}

 ngOnInit() {
 this.updateClock();
 this.clockInterval = setInterval(() => this.updateClock(), 1000);
 
 // Set default date to today
 const today = new Date();
 this.selectedDate = today.toISOString().split('T')[0];
 
 this.authService.user$.subscribe((u) => {
 this.user = u;
 if (this.user) {
 this.loadMyAttendance();
 if (this.user.role === 'hr') {
 this.loadAllAttendance();
 }
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

 loadAllAttendance() {
 // Get selected date or default to today
 const dateToLoad = this.selectedDate || new Date().toISOString().split('T')[0];
 
 this.attendanceService.getTeamAttendanceWithSchedule(dateToLoad).subscribe({
 next: (logs: any) => {
 this.allAttendanceLogs = logs.reverse();
 this.filteredAttendanceLogs = [...this.allAttendanceLogs];
 this.filterAttendance();
 },
 error: (err) => {
 console.error('Error loading team attendance with schedule:', err);
 // Fallback to regular attendance if schedule endpoint fails
 this.attendanceService.getAllAttendance().subscribe({
 next: (logs: any) => {
 this.allAttendanceLogs = logs.reverse();
 this.filteredAttendanceLogs = [...this.allAttendanceLogs];
 },
 error: (err) => console.error(err),
 });
 },
 });
 }

 onDateChange() {
 if (this.user && this.user.role === 'hr') {
 this.allAttendancePage = 1; // Reset to first page
 this.loadAllAttendance();
 }
 }

 filterAttendance() {
 let filtered = [...this.allAttendanceLogs];

 // Filter by search term
 if (this.searchTerm) {
 const term = this.searchTerm.toLowerCase();
 filtered = filtered.filter(log => {
 const fullName = `${log.employee?.firstName || ''} ${log.employee?.lastName || ''}`.toLowerCase();
 const employeeId = (log.employee?.employeeId || '').toLowerCase();
 return fullName.includes(term) || employeeId.includes(term);
 });
 }

 // Filter by department
 if (this.filterDepartment) {
 filtered = filtered.filter(log => log.employee?.department === this.filterDepartment);
 }

 // Filter by status
 if (this.filterStatus) {
 filtered = filtered.filter(log => {
 if (log.scheduleComparison && log.scheduleComparison.status) {
 return log.scheduleComparison.status === this.filterStatus;
 }
 return false;
 });
 }

 this.filteredAttendanceLogs = filtered;
 this.allAttendancePage = 1; // Reset to first page when filtering
 }

 async clockIn() {
 const confirmed = await this.modalService.confirm(
 'Clock In',
 'Confirm you are clocking in for today?',
 () => {
 this.loading = true;
 this.attendanceService.clockIn().subscribe({
 next: (response: any) => {
 this.modalService.success(
 'Clocked In Successfully',
 `Welcome! You clocked in at ${new Date().toLocaleTimeString()}.`
 );
 this.loadMyAttendance();
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
 const confirmed = await this.modalService.confirm(
 'Clock Out',
 'Confirm you are clocking out for today?',
 () => {
 this.loading = true;
 this.attendanceService.clockOut().subscribe({
 next: (response: any) => {
 const duration = response.data?.duration || 'N/A';
 this.modalService.success(
 'Clocked Out Successfully',
 `You clocked out at ${new Date().toLocaleTimeString()}. Total time: ${duration}`
 );
 this.loadMyAttendance();
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
 if (!this.todayStatus || !this.todayStatus.clockIn) {
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
 
 // Count on-time days
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

 getTeamStats() {
 const today = new Date().toISOString().split('T')[0];
 const todayLogs = this.allAttendanceLogs.filter(log => log.date === today);
 
 let present = 0;
 let late = 0;
 let absent = 0;
 
 todayLogs.forEach(log => {
 if (this.isLate(log.clockIn)) {
 late++;
 } else if (log.clockIn) {
 present++;
 }
 });
 
 return {
 present: present,
 late: late,
 absent: absent,
 total: todayLogs.length
 };
 }

 // Helper functions for late/early detection (8 AM - 5 PM standard)
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
 const standardStart = 8 * 60; // 8:00 AM
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
 const standardEnd = 17 * 60; // 5:00 PM
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

 // Get status from schedule comparison (new method for enhanced attendance records)
 getScheduleStatus(log: any): string {
 if (log.scheduleComparison && log.scheduleComparison.status) {
 const status = log.scheduleComparison.status;
 switch (status) {
 case 'on_time': return 'On Time';
 case 'late': return 'Late';
 case 'early': return 'Early Check-in';
 case 'early_close': return 'Early Close';
 case 'absent': return 'Absent';
 case 'overtime': return 'Overtime';
 case 'unscheduled': return 'Unscheduled';
 default: return 'Unknown';
 }
 }
 // Fallback to old method if no schedule comparison
 return this.getStatusText(log.clockIn, log.clockOut);
 }

 getScheduleStatusClass(log: any): string {
 if (log.scheduleComparison && log.scheduleComparison.status) {
 const status = log.scheduleComparison.status;
 switch (status) {
 case 'on_time':
 return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
 case 'late':
 return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
 case 'early':
 return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
 case 'early_close':
 return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
 case 'absent':
 return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
 case 'overtime':
 return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
 case 'unscheduled':
 return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
 default:
 return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800';
 }
 }
 // Fallback to old logic
 const late = this.isLate(log.clockIn);
 const early = log.clockOut ? this.isEarlyDeparture(log.clockOut) : false;
 
 if (late && early) {
 return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
 } else if (late) {
 return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
 } else if (early) {
 return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
 }
 return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
 }

 formatTime(timeStr: string): string {
 if (!timeStr) return '—';
 const date = new Date(timeStr);
 return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
 }
}
