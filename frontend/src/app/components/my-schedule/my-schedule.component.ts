import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Schedule {
  id: string;
  employeeId: string;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  status: string;
  shift?: {
    name: string;
    shiftType: string;
    color: string;
    breakDuration: number;
  };
}

interface Availability {
  id?: string;
  employeeId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  availableFrom: string;
  availableTo: string;
  preferredShifts: string[];
  notes: string;
}

@Component({
  selector: 'app-my-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-schedule.component.html',
  styleUrls: ['./my-schedule.component.css']
})
export class MyScheduleComponent implements OnInit {
  // User data
  currentUser: any = null;
  employee: any = null;

  // Schedule data
  upcomingSchedules: Schedule[] = [];
  pastSchedules: Schedule[] = [];
  currentWeekSchedules: Schedule[] = [];

  // Availability data
  weeklyAvailability: Availability[] = [];
  shifts: any[] = [];

  // View state
  loading = false;
  error = '';
  successMessage = '';
  activeTab: 'upcoming' | 'availability' = 'upcoming';

  // Availability modal
  showAvailabilityModal = false;
  availabilityForm: Availability[] = [];

  dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadCurrentUser();
    
    // Auto-refresh schedules every 30 seconds to catch new assignments
    setInterval(() => {
      if (this.employee && !this.loading) {
        this.loadSchedules();
      }
    }, 30000); // 30 seconds
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  loadCurrentUser() {
    // Get current user from localStorage or auth service
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.currentUser = JSON.parse(userStr);
      this.loadEmployeeProfile();
    }
  }

  loadEmployeeProfile() {
    this.http.get<any>(`${this.apiUrl}/employees`, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          const employees = response.data || response || [];
          
          this.employee = employees.find((e: any) => 
            e.userId === this.currentUser.id || 
            e.email === this.currentUser.email ||
            e.email === this.currentUser.username ||
            e.id == this.currentUser.employeeId
          );
          
          if (this.employee) {
            this.loadSchedules();
            this.loadAvailability();
            this.loadShifts();
          } else {
            this.error = 'Employee profile not found. Please contact HR.';
          }
        },
        error: (error) => {
          console.error('Error loading employee profile:', error);
          this.error = 'Failed to load employee profile';
        }
      });
  }

  loadSchedules() {
    if (!this.employee) return;

    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAhead = new Date(today);
    thirtyDaysAhead.setDate(today.getDate() + 30);

    const startDate = this.formatDate(thirtyDaysAgo);
    const endDate = this.formatDate(thirtyDaysAhead);

    this.loading = true;
    this.http.get<any>(`${this.apiUrl}/schedules?employeeId=${this.employee.id}&startDate=${startDate}&endDate=${endDate}`, 
      { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          const schedules = response.data || response;
          const todayStr = this.formatDate(today);

          this.upcomingSchedules = schedules
            .filter((s: Schedule) => s.date >= todayStr)
            .sort((a: Schedule, b: Schedule) => a.date.localeCompare(b.date));

          this.pastSchedules = schedules
            .filter((s: Schedule) => s.date < todayStr)
            .sort((a: Schedule, b: Schedule) => b.date.localeCompare(a.date));

          // Get current week schedules
          const weekStart = this.getWeekStart(today);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          this.currentWeekSchedules = schedules.filter((s: Schedule) => {
            const scheduleDate = new Date(s.date);
            return scheduleDate >= weekStart && scheduleDate <= weekEnd;
          });

          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading schedules:', error);
          this.error = 'Failed to load schedules';
          this.loading = false;
        }
      });
  }

  loadAvailability() {
    if (!this.employee) return;

    this.http.get<any>(`${this.apiUrl}/availability?employeeId=${this.employee.id}`, 
      { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          let data = [];
          if (response.data && Array.isArray(response.data)) {
            data = response.data;
          } else if (Array.isArray(response)) {
            data = response;
          }
          
          this.weeklyAvailability = data;
          this.initializeAvailabilityForm();
        },
        error: (error) => {
          console.error('Error loading availability:', error);
        }
      });
  }

  loadShifts() {
    this.http.get<any>(`${this.apiUrl}/shifts?activeOnly=true`, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.shifts = response.data || response;
        },
        error: (error) => {
          console.error('Error loading shifts:', error);
        }
      });
  }

  initializeAvailabilityForm() {
    this.availabilityForm = [];
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const existing = this.weeklyAvailability.find(a => a.dayOfWeek === dayOfWeek);
      if (existing) {
        this.availabilityForm.push({ ...existing });
      } else {
        this.availabilityForm.push({
          employeeId: this.employee.id,
          dayOfWeek,
          isAvailable: true,
          availableFrom: '09:00',
          availableTo: '17:00',
          preferredShifts: [],
          notes: ''
        });
      }
    }
  }

  // Tab Management
  switchTab(tab: 'upcoming' | 'availability') {
    this.activeTab = tab;
  }

  // Availability Management
  openAvailabilityModal() {
    this.initializeAvailabilityForm();
    this.showAvailabilityModal = true;
  }

  closeAvailabilityModal() {
    this.showAvailabilityModal = false;
  }

  saveAvailability() {
    if (!this.employee) return;

    this.loading = true;
    this.error = '';

    const payload = {
      employeeId: this.employee.id,
      weeklyData: this.availabilityForm
    };

    this.http.post<any>(`${this.apiUrl}/availability/weekly`, payload, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Availability updated successfully';
          this.loadAvailability();
          this.closeAvailabilityModal();
          this.loading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error saving availability:', error);
          this.error = error.error?.message || 'Failed to save availability';
          this.loading = false;
        }
      });
  }

  toggleShiftPreference(dayIndex: number, shiftId: string) {
    const day = this.availabilityForm[dayIndex];
    if (!day) return;

    const index = day.preferredShifts.indexOf(shiftId);
    if (index > -1) {
      day.preferredShifts.splice(index, 1);
    } else {
      day.preferredShifts.push(shiftId);
    }
  }

  isShiftPreferred(dayIndex: number, shiftId: string): boolean {
    const day = this.availabilityForm[dayIndex];
    return day ? day.preferredShifts.includes(shiftId) : false;
  }

  getAvailabilityForDay(dayOfWeek: number): Availability | null {
    const availability = this.weeklyAvailability.find(a => a.dayOfWeek == dayOfWeek) || null;
    return availability;
  }

  // Helpers
  formatDate(date: Date): string {
    // Use local date to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateDisplay(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getDayName(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  getWeekStart(date: Date): Date {
    const day = date.getDay();
    const monday = new Date(date);
    monday.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  isToday(dateStr: string): boolean {
    const today = new Date();
    const scheduleDate = new Date(dateStr);
    return today.toDateString() === scheduleDate.toDateString();
  }

  isTomorrow(dateStr: string): boolean {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduleDate = new Date(dateStr);
    return tomorrow.toDateString() === scheduleDate.toDateString();
  }

  getRelativeDate(dateStr: string): string {
    if (this.isToday(dateStr)) return 'Today';
    if (this.isTomorrow(dateStr)) return 'Tomorrow';
    return this.formatDateDisplay(dateStr);
  }

  getShiftDuration(schedule: Schedule): string {
    const start = new Date(`2000-01-01T${schedule.startTime}`);
    const end = new Date(`2000-01-01T${schedule.endTime}`);
    let diff = (end.getTime() - start.getTime()) / (1000 * 60); // minutes

    if (schedule.shift?.breakDuration) {
      diff -= schedule.shift.breakDuration;
    }

    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours}h`;
  }

  getTotalHoursThisWeek(): number {
    let totalMinutes = 0;
    this.currentWeekSchedules.forEach(schedule => {
      const start = new Date(`2000-01-01T${schedule.startTime}`);
      const end = new Date(`2000-01-01T${schedule.endTime}`);
      let diff = (end.getTime() - start.getTime()) / (1000 * 60);
      
      if (schedule.shift?.breakDuration) {
        diff -= schedule.shift.breakDuration;
      }
      
      totalMinutes += diff;
    });

    return Math.round((totalMinutes / 60) * 10) / 10;
  }

  getShiftTypeLabel(type: string): string {
    const types: Record<string, string> = {
      'morning': 'Morning',
      'afternoon': 'Afternoon',
      'night': 'Night',
      'custom': 'Custom'
    };
    return types[type] || type;
  }
}


