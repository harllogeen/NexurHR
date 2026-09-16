import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

interface Shift {
  id: string;
  name: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  department: string;
  workingDays: number[];
  requiredEmployees: number;
  color: string;
  isActive: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-shift-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shift-management.component.html',
  styleUrls: ['./shift-management.component.css']
})
export class ShiftManagementComponent implements OnInit {
  shifts: Shift[] = [];
  departments: any[] = [];
  loading = false;
  error = '';
  successMessage = '';

  // Modal state
  showModal = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedShift: Shift | null = null;

  // Form data
  shiftForm = {
    name: '',
    shiftType: 'morning',
    startTime: '08:00',
    endTime: '16:00',
    breakDuration: 60,
    department: 'all',
    workingDays: [1, 2, 3, 4, 5] as number[],
    requiredEmployees: 1,
    color: '#3b82f6',
    isActive: true,
    description: ''
  };

  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  shiftTypes = [
    { value: 'morning', label: 'Morning Shift' },
    { value: 'afternoon', label: 'Afternoon Shift' },
    { value: 'night', label: 'Night Shift' },
    { value: 'custom', label: 'Custom Shift' }
  ];

  colorOptions = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#10b981', label: 'Green' },
    { value: '#ef4444', label: 'Red' },
    { value: '#ec4899', label: 'Pink' }
  ];

  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadShifts();
    this.loadDepartments();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  loadShifts() {
    this.loading = true;
    this.error = '';

    this.http.get<any>(`${this.apiUrl}/shifts`, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.shifts = response.data || response;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading shifts:', error);
          this.error = 'Failed to load shifts';
          this.loading = false;
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

  openCreateModal() {
    this.modalMode = 'create';
    this.selectedShift = null;
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(shift: Shift) {
    this.modalMode = 'edit';
    this.selectedShift = shift;
    this.shiftForm = {
      name: shift.name,
      shiftType: shift.shiftType,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: shift.breakDuration,
      department: shift.department,
      workingDays: [...shift.workingDays],
      requiredEmployees: shift.requiredEmployees,
      color: shift.color,
      isActive: shift.isActive,
      description: shift.description
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedShift = null;
    this.resetForm();
  }

  resetForm() {
    this.shiftForm = {
      name: '',
      shiftType: 'morning',
      startTime: '08:00',
      endTime: '16:00',
      breakDuration: 60,
      department: 'all',
      workingDays: [1, 2, 3, 4, 5],
      requiredEmployees: 1,
      color: '#3b82f6',
      isActive: true,
      description: ''
    };
  }

  toggleWorkingDay(day: number) {
    const index = this.shiftForm.workingDays.indexOf(day);
    if (index > -1) {
      this.shiftForm.workingDays.splice(index, 1);
    } else {
      this.shiftForm.workingDays.push(day);
      this.shiftForm.workingDays.sort((a, b) => a - b);
    }
  }

  isWorkingDay(day: number): boolean {
    return this.shiftForm.workingDays.includes(day);
  }

  saveShift() {
    this.error = '';
    this.successMessage = '';

    if (!this.shiftForm.name || !this.shiftForm.startTime || !this.shiftForm.endTime) {
      this.error = 'Please fill in all required fields';
      return;
    }

    if (this.shiftForm.workingDays.length === 0) {
      this.error = 'Please select at least one working day';
      return;
    }

    this.loading = true;

    if (this.modalMode === 'create') {
      this.http.post<any>(`${this.apiUrl}/shifts`, this.shiftForm, { headers: this.getHeaders() })
        .subscribe({
          next: (response) => {
            this.successMessage = 'Shift created successfully';
            this.loadShifts();
            this.closeModal();
            this.loading = false;
          },
          error: (error) => {
            console.error('Error creating shift:', error);
            this.error = error.error?.message || 'Failed to create shift';
            this.loading = false;
          }
        });
    } else if (this.selectedShift) {
      this.http.put<any>(`${this.apiUrl}/shifts/${this.selectedShift.id}`, this.shiftForm, { headers: this.getHeaders() })
        .subscribe({
          next: (response) => {
            this.successMessage = 'Shift updated successfully';
            this.loadShifts();
            this.closeModal();
            this.loading = false;
          },
          error: (error) => {
            console.error('Error updating shift:', error);
            this.error = error.error?.message || 'Failed to update shift';
            this.loading = false;
          }
        });
    }
  }

  deleteShift(shift: Shift) {
    if (!confirm(`Are you sure you want to delete the shift "${shift.name}"? This cannot be undone.`)) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.http.delete<any>(`${this.apiUrl}/shifts/${shift.id}`, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Shift deleted successfully';
          this.loadShifts();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error deleting shift:', error);
          this.error = error.error?.message || 'Failed to delete shift';
          this.loading = false;
        }
      });
  }

  toggleShiftStatus(shift: Shift) {
    this.loading = true;
    this.error = '';

    this.http.put<any>(`${this.apiUrl}/shifts/${shift.id}`, { isActive: !shift.isActive }, { headers: this.getHeaders() })
      .subscribe({
        next: (response) => {
          this.successMessage = `Shift ${shift.isActive ? 'deactivated' : 'activated'} successfully`;
          this.loadShifts();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error toggling shift status:', error);
          this.error = error.error?.message || 'Failed to update shift status';
          this.loading = false;
        }
      });
  }

  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  getWorkingDaysDisplay(days: number[]): string {
    if (days.length === 7) return 'All days';
    if (days.length === 0) return 'No days';
    
    const sortedDays = [...days].sort((a, b) => a - b);
    return sortedDays.map(d => this.dayNames[d]).join(', ');
  }

  getDepartmentName(deptId: string): string {
    if (deptId === 'all') return 'All Departments';
    const dept = this.departments.find(d => d.id === deptId);
    return dept ? dept.name : deptId;
  }

  getShiftTypeLabel(type: string): string {
    const shiftType = this.shiftTypes.find(st => st.value === type);
    return shiftType ? shiftType.label : type;
  }
}
