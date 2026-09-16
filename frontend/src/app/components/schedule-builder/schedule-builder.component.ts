import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ModalService } from '../../services/modal.service';

interface Schedule {
  id: string;
  employeeId: string;
  shiftId: string;
  date: string;
  startTime: string;
  endTime: string;
  department: string;
  status: string;
  employee?: any;
  shift?: any;
}

interface Shift {
  id: string;
  name: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  color: string;
  requiredEmployees: number;
  workingDays: number[];
  department?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: string;
  position: string;
  profilePicture?: string;
}

interface EmployeeAvailability {
  employeeId: string;
  dayOfWeek: number;
  isAvailable: boolean;
  availableFrom: string;
  availableTo: string;
  preferredShifts: string[];
  notes: string;
}

interface Leave {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
}

@Component({
  selector: 'app-schedule-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule-builder.component.html',
  styleUrls: ['./schedule-builder.component.css']
})
export class ScheduleBuilderComponent implements OnInit {
  // Data
  schedules: Schedule[] = [];
  shifts: Shift[] = [];
  employees: Employee[] = [];
  departments: any[] = [];
  availability: EmployeeAvailability[] = [];
  leaves: Leave[] = [];

  // View state
  loading = false;
  error = '';
  successMessage = '';
  showAvailabilityPanel = false;
  
  // Calendar state
  currentWeekStart: Date = new Date();
  weekDays: Date[] = [];
  
  // Filters
  selectedDepartment: string | null = null;
  selectedShifts: string[] = [];
  
  // Auto-generate modal
  showAutoGenerateModal = false;
  autoGenerateForm = {
    startDate: '',
    endDate: '',
    departmentId: null as string | null,
    shiftIds: [] as string[]
  };
  autoGenerateResult: any = null;
  
  // Manual assign modal
  showAssignModal = false;
  assignForm = {
    date: '',
    shiftId: '',
    employeeId: ''
  };

  // Employee list modal
  showEmployeeListModal = false;
  employeeListModalData: {
    day: Date | null;
    shift: Shift | null;
    date: string;
    schedules: Schedule[];
  } = {
    day: null,
    shift: null,
    date: '',
    schedules: []
  };

  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private modalService: ModalService) {}

  ngOnInit() {
    this.initializeWeek();
    this.loadShifts();
    this.loadEmployees();
    this.loadDepartments();
    this.loadSchedules();
    this.loadAvailability();
    this.loadLeaves();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Calendar Navigation
  initializeWeek() {
    const today = new Date();
    // Get the Monday of the current week
    // If today is Sunday (0), go back to previous Monday (-6 days)
    // Otherwise, go to the Monday of this week
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    this.currentWeekStart = monday;
    this.updateWeekDays();
  }

  updateWeekDays() {
    this.weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(this.currentWeekStart);
      day.setDate(this.currentWeekStart.getDate() + i);
      this.weekDays.push(day);
    }
    this.autoGenerateForm.startDate = this.formatDate(this.weekDays[0]);
    this.autoGenerateForm.endDate = this.formatDate(this.weekDays[6]);
  }

  previousWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.updateWeekDays();
    this.loadSchedules();
    this.loadLeaves();
  }

  nextWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.updateWeekDays();
    this.loadSchedules();
    this.loadLeaves();
  }

  goToToday() {
    this.initializeWeek();
    this.loadSchedules();
    this.loadLeaves();
  }

  // Data Loading
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

  loadEmployees() {
    this.http.get<any>(`${this.apiUrl}/employees`, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.employees = response.data || response || [];
          console.log('Loaded employees:', this.employees);
          console.log('Employee IDs:', this.employees.map(e => ({ id: e.id, type: typeof e.id, name: `${e.firstName} ${e.lastName}` })));
        },
        error: (error) => {
          console.error('Error loading employees:', error);
        }
      });
  }

  loadDepartments() {
    this.http.get<any>(`${this.apiUrl}/departments`, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.departments = response.data || response;
        },
        error: (error) => {
          console.error('Error loading departments:', error);
        }
      });
  }

  loadSchedules() {
    const startDate = this.formatDate(this.weekDays[0]);
    const endDate = this.formatDate(this.weekDays[6]);
    
    let url = `${this.apiUrl}/schedules?startDate=${startDate}&endDate=${endDate}`;
    if (this.selectedDepartment) {
      url += `&department=${this.selectedDepartment}`;
    }

    this.loading = true;
    this.http.get<any>(url, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.schedules = response.data || response;
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
    this.http.get<any>(`${this.apiUrl}/availability`, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.availability = response.data || response || [];
        },
        error: (error) => {
          console.error('Error loading availability:', error);
        }
      });
  }

  loadLeaves() {
    const startDate = this.formatDate(this.weekDays[0]);
    const endDate = this.formatDate(this.weekDays[6]);
    
    this.http.get<any>(`${this.apiUrl}/leaves?startDate=${startDate}&endDate=${endDate}`, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.leaves = response.data || response || [];
        },
        error: (error) => {
          console.error('Error loading leaves:', error);
        }
      });
  }

  // Schedule Management
  getSchedulesForDateAndShift(date: Date, shift: Shift): Schedule[] {
    const dateStr = this.formatDate(date);
    return this.schedules.filter(s => 
      s.date === dateStr && 
      s.shiftId === shift.id &&
      (!this.selectedDepartment || s.department === this.selectedDepartment)
    );
  }

  getFilteredShifts(): Shift[] {
    let filtered = this.shifts;
    if (this.selectedDepartment) {
      filtered = filtered.filter(s => 
        s.department === this.selectedDepartment || s.department === 'all'
      );
    }
    if (this.selectedShifts.length > 0) {
      filtered = filtered.filter(s => this.selectedShifts.includes(s.id));
    }
    return filtered;
  }

  // Manual Assignment
  openAssignModal(date: Date, shift: Shift) {
    this.assignForm = {
      date: this.formatDate(date),
      shiftId: shift.id,
      employeeId: ''
    };
    this.showAssignModal = true;
  }

  closeAssignModal() {
    this.showAssignModal = false;
  }

  // Employee List Modal
  showEmployeeList(day: Date, shift: Shift) {
    const schedules = this.getSchedulesForDateAndShift(day, shift);
    this.employeeListModalData = {
      day: day,
      shift: shift,
      date: this.formatDate(day),
      schedules: schedules
    };
    this.showEmployeeListModal = true;
  }

  closeEmployeeListModal() {
    this.showEmployeeListModal = false;
    this.employeeListModalData = {
      day: null,
      shift: null,
      date: '',
      schedules: []
    };
  }

  assignEmployee() {
    if (!this.assignForm.employeeId) {
      this.error = 'Please select an employee';
      return;
    }

    this.loading = true;
    this.error = '';

    this.http.post<any>(`${this.apiUrl}/schedules`, this.assignForm, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Employee assigned successfully';
          this.loadSchedules();
          this.closeAssignModal();
          this.loading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error assigning employee:', error);
          this.error = error.error?.message || 'Failed to assign employee';
          this.loading = false;
        }
      });
  }

  async removeSchedule(schedule: Schedule) {
    const employeeName = this.getEmployeeName(schedule.employeeId);
    const shiftName = this.shifts.find(s => s.id === schedule.shiftId)?.name || 'shift';
    
    await this.modalService.confirm(
      'Remove Assignment?',
      `Remove ${employeeName} from ${shiftName}?`,
      () => {
        this.loading = true;
        this.http.delete<any>(`${this.apiUrl}/schedules/${schedule.id}`, { headers: this.getHeaders() })
          .subscribe({
            next: () => {
              this.modalService.success('Assignment Removed', `${employeeName} has been removed from the schedule.`);
              this.loadSchedules();
              this.loading = false;
            },
            error: (error) => {
              console.error('Error removing schedule:', error);
              this.modalService.error('Failed to Remove', error.error?.message || 'Could not remove the assignment.');
              this.loading = false;
            }
          });
      },
      'Remove',
      'Cancel'
    );
  }

  // Auto-Generate
  openAutoGenerateModal() {
    this.autoGenerateForm.shiftIds = this.shifts.map(s => s.id);
    this.autoGenerateResult = null;
    this.showAutoGenerateModal = true;
  }

  closeAutoGenerateModal() {
    this.showAutoGenerateModal = false;
    this.autoGenerateResult = null;
  }

  toggleShiftSelection(shiftId: string) {
    const index = this.autoGenerateForm.shiftIds.indexOf(shiftId);
    if (index > -1) {
      this.autoGenerateForm.shiftIds.splice(index, 1);
    } else {
      this.autoGenerateForm.shiftIds.push(shiftId);
    }
  }

  isShiftSelected(shiftId: string): boolean {
    return this.autoGenerateForm.shiftIds.includes(shiftId);
  }

  autoGenerateSchedules() {
    if (this.autoGenerateForm.shiftIds.length === 0) {
      this.error = 'Please select at least one shift';
      return;
    }

    this.loading = true;
    this.error = '';

    const payload = {
      startDate: this.autoGenerateForm.startDate,
      endDate: this.autoGenerateForm.endDate,
      departmentId: this.autoGenerateForm.departmentId,
      shiftIds: this.autoGenerateForm.shiftIds
    };

    this.http.post<any>(`${this.apiUrl}/schedules/auto-generate`, payload, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.autoGenerateResult = response.data;
          this.successMessage = `Generated ${response.data.schedules.length} schedules`;
          this.loadSchedules();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error auto-generating schedules:', error);
          this.error = error.error?.message || 'Failed to generate schedules';
          this.loading = false;
        }
      });
  }

  async clearWeekSchedules() {
    const startDate = this.formatDate(this.weekDays[0]);
    const endDate = this.formatDate(this.weekDays[6]);
    const weekRange = `${this.weekDays[0].toLocaleDateString()} - ${this.weekDays[6].toLocaleDateString()}`;

    await this.modalService.confirmDelete(
      'Clear All Schedules?',
      `This will permanently delete all schedules for the week of ${weekRange}.\n\nThis action cannot be undone.`,
      () => {
        this.loading = true;
        this.http.post<any>(`${this.apiUrl}/schedules/clear`, { startDate, endDate }, { headers: this.getHeaders() })
          .subscribe({
            next: (response) => {
              const count = response.data?.deletedCount || 0;
              this.modalService.success(
                'Schedules Cleared',
                `Successfully deleted ${count} schedule${count !== 1 ? 's' : ''} for this week.`
              );
              this.loadSchedules();
              this.loading = false;
            },
            error: (error) => {
              console.error('Error clearing schedules:', error);
              this.modalService.error(
                'Failed to Clear Schedules',
                error.error?.message || 'Could not clear schedules. Please try again.'
              );
              this.loading = false;
            }
          });
      },
      weekRange
    );
  }

  // Helpers
  formatDate(date: Date): string {
    // Use local date to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDateDisplay(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  getWeekDisplay(): string {
    const start = this.formatDateDisplay(this.weekDays[0]);
    const end = this.formatDateDisplay(this.weekDays[6]);
    const year = this.weekDays[0].getFullYear();
    return `${start} - ${end}, ${year}`;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  getEmployeeName(employeeId: string): string {
  
    const emp = this.employees.find(e => e.id == employeeId);
    if (!emp) {
      console.warn('Employee not found for ID:', employeeId, 'Available employees:', this.employees.length);
    }
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Employee';
  }

  getEmployeeInitials(employeeId: string): string {
    const emp = this.employees.find(e => e.id == employeeId);
    if (!emp) return '??';
    return `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase();
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getAvailableEmployees(): Employee[] {
    if (!this.assignForm.date || !this.assignForm.shiftId) {
      return this.employees;
    }

    // Filter out employees already assigned to this date/shift
    const assigned = this.schedules
      .filter(s => s.date === this.assignForm.date && s.shiftId === this.assignForm.shiftId)
      .map(s => s.employeeId);

    return this.employees.filter(e => !assigned.includes(e.id));
  }

  // Availability Panel Methods
  toggleAvailabilityPanel() {
    this.showAvailabilityPanel = !this.showAvailabilityPanel;
  }

  getFilteredEmployeesForPanel(): Employee[] {
    if (!this.selectedDepartment) {
      return this.employees;
    }
    return this.employees.filter(e => e.department === this.selectedDepartment);
  }

  isEmployeeAvailable(employeeId: string, date: Date): boolean {
    const dayOfWeek = date.getDay();
    const availability = this.availability.find(a => 
      a.employeeId == employeeId && a.dayOfWeek === dayOfWeek
    );
    return availability ? availability.isAvailable : false;
  }

  isEmployeeOnLeave(employeeId: string, date: Date): boolean {
    const dateStr = this.formatDate(date);
    return this.leaves.some(leave => 
      leave.employeeId == employeeId &&
      leave.status === 'approved' &&
      dateStr >= leave.startDate &&
      dateStr <= leave.endDate
    );
  }

  isEmployeeScheduled(employeeId: string, date: Date): boolean {
    const dateStr = this.formatDate(date);
    return this.schedules.some(s => 
      s.employeeId == employeeId && s.date === dateStr
    );
  }

  getEmployeeAvailability(employeeId: string, date: Date): EmployeeAvailability | null {
    const dayOfWeek = date.getDay();
    return this.availability.find(a => 
      a.employeeId == employeeId && a.dayOfWeek === dayOfWeek
    ) || null;
  }

  getEmployeePreferredShiftNames(employeeId: string, date: Date): string {
    const avail = this.getEmployeeAvailability(employeeId, date);
    if (!avail || avail.preferredShifts.length === 0) {
      return 'Any';
    }
    
    const shiftNames = avail.preferredShifts
      .map(shiftId => {
        const shift = this.shifts.find(s => s.id === shiftId);
        if (!shift) return null;
        // Return emoji based on shift type
        if (shift.shiftType === 'morning') return '🌅';
        if (shift.shiftType === 'afternoon') return '🌆';
        if (shift.shiftType === 'night') return '🌙';
        return '⏰';
      })
      .filter(name => name !== null);
    
    return shiftNames.length > 0 ? shiftNames.join(' ') : 'Any';
  }

  getEmployeeAvailableTime(employeeId: string, date: Date): string {
    const avail = this.getEmployeeAvailability(employeeId, date);
    if (!avail || !avail.isAvailable) {
      return '';
    }
    return `${this.formatTime(avail.availableFrom)}-${this.formatTime(avail.availableTo)}`;
  }

  getEmployeeScheduleCount(employeeId: string): number {
    return this.schedules.filter(s => s.employeeId == employeeId).length;
  }

  quickAssignFromAvailability(employee: Employee, date: Date) {
    // Find best matching shift based on availability
    const avail = this.getEmployeeAvailability(employee.id, date);
    
    let bestShift: Shift | null = null;
    
    // If they have preferred shifts, use the first one
    if (avail && avail.preferredShifts.length > 0) {
      bestShift = this.shifts.find(s => s.id === avail.preferredShifts[0]) || null;
    }
    
    // Otherwise, pick the first shift that fits their time
    if (!bestShift && this.shifts.length > 0) {
      bestShift = this.shifts[0];
    }
    
    if (!bestShift) {
      this.error = 'No shifts available';
      return;
    }
    
    this.assignForm = {
      date: this.formatDate(date),
      shiftId: bestShift.id,
      employeeId: employee.id
    };
    
    this.assignEmployee();
  }
}
