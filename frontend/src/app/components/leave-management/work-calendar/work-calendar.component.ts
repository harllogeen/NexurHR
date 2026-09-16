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
  selector: 'app-work-calendar',
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
  templateUrl: './work-calendar.component.html',
  styleUrl: './work-calendar.component.css'
})
export class WorkCalendarComponent implements OnInit {
  private leaveService = inject(LeaveService);
  private alertService = inject(AlertService);

  // Tab Management
  activeTab: 'calendars' | 'holidays' = 'calendars';

  // Calendars
  calendars: any[] = [];
  loadingCalendars = false;
  isCalendarModalOpen = false;
  isEditCalendarMode = false;
  showDeleteCalendarModal = false;
  deletingCalendar = false;

  deleteCalendarConfig = {
    title: 'Delete Work Calendar',
    message: '',
    calendarId: 0,
    onConfirm: () => {}
  };

  calendarForm: any = {
    name: '',
    description: '',
    weekendDays: [0, 6],
    workingHoursPerDay: 8,
    department: '',
    isDefault: false
  };

  // Holidays
  holidays: any[] = [];
  loadingHolidays = false;
  isHolidayModalOpen = false;
  isEditHolidayMode = false;
  showDeleteHolidayModal = false;
  deletingHoliday = false;

  deleteHolidayConfig = {
    title: 'Delete Holiday',
    message: '',
    holidayId: 0,
    onConfirm: () => {}
  };

  holidayForm: any = {
    name: '',
    date: '',
    description: '',
    department: '',
    recurring: false
  };

  selectedYear: number = new Date().getFullYear();
  yearOptions: any[] = [];

  weekDays = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  ngOnInit() {
    this.initializeYearOptions();
    this.loadCalendars();
    this.loadHolidays();
  }

  initializeYearOptions() {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 1; i <= currentYear + 3; i++) {
      this.yearOptions.push({ value: i, label: i.toString() });
    }
  }

  switchTab(tab: 'calendars' | 'holidays') {
    this.activeTab = tab;
  }

  // ========================================
  // CALENDAR MANAGEMENT
  // ========================================

  loadCalendars() {
    this.loadingCalendars = true;
    this.leaveService.getAllCalendars().subscribe({
      next: (response: any) => {
        this.calendars = response.calendars || [];
        this.loadingCalendars = false;
      },
      error: (error) => {
        console.error('Error loading calendars:', error);
        this.alertService.showAlert('error', 'Error', 'Failed to load work calendars');
        this.loadingCalendars = false;
      }
    });
  }

  openCreateCalendarModal() {
    this.isEditCalendarMode = false;
    this.resetCalendarForm();
    this.isCalendarModalOpen = true;
  }

  openEditCalendarModal(calendar: any) {
    this.isEditCalendarMode = true;
    this.calendarForm = {
      id: calendar.id,
      name: calendar.name,
      description: calendar.description,
      weekendDays: calendar.weekendDays || [],
      workingHoursPerDay: calendar.workingHoursPerDay,
      department: calendar.department || '',
      isDefault: calendar.isDefault
    };
    this.isCalendarModalOpen = true;
  }

  closeCalendarModal() {
    this.isCalendarModalOpen = false;
    this.resetCalendarForm();
  }

  resetCalendarForm() {
    this.calendarForm = {
      name: '',
      description: '',
      weekendDays: [0, 6],
      workingHoursPerDay: 8,
      department: '',
      isDefault: false
    };
  }

  onWeekendDayToggle(day: number) {
    const index = this.calendarForm.weekendDays.indexOf(day);
    if (index > -1) {
      this.calendarForm.weekendDays.splice(index, 1);
    } else {
      this.calendarForm.weekendDays.push(day);
    }
  }

  saveCalendar() {
    if (!this.calendarForm.name) {
      this.alertService.showAlert('error', 'Validation Error', 'Please enter a calendar name');
      return;
    }

    this.loadingCalendars = true;

    if (this.isEditCalendarMode) {
      this.leaveService.updateCalendar(this.calendarForm.id, this.calendarForm).subscribe({
        next: (response: any) => {
          this.alertService.showAlert('success', 'Success', 'Work calendar updated successfully');
          this.loadCalendars();
          this.closeCalendarModal();
          this.loadingCalendars = false;
        },
        error: (error) => {
          console.error('Error updating calendar:', error);
          this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to update calendar');
          this.loadingCalendars = false;
        }
      });
    } else {
      this.leaveService.createCalendar(this.calendarForm).subscribe({
        next: (response: any) => {
          this.alertService.showAlert('success', 'Success', 'Work calendar created successfully');
          this.loadCalendars();
          this.closeCalendarModal();
          this.loadingCalendars = false;
        },
        error: (error) => {
          console.error('Error creating calendar:', error);
          this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to create calendar');
          this.loadingCalendars = false;
        }
      });
    }
  }

  openDeleteCalendarModal(calendar: any) {
    this.deleteCalendarConfig = {
      title: 'Delete Work Calendar',
      message: `Are you sure you want to delete "${calendar.name}"? This action cannot be undone.`,
      calendarId: calendar.id,
      onConfirm: () => this.confirmDeleteCalendar(calendar.id)
    };
    this.showDeleteCalendarModal = true;
  }

  confirmDeleteCalendar(calendarId: number) {
    this.deletingCalendar = true;
    this.leaveService.deleteCalendar(calendarId).subscribe({
      next: (response: any) => {
        this.alertService.showAlert('success', 'Success', 'Work calendar deleted successfully');
        this.loadCalendars();
        this.showDeleteCalendarModal = false;
        this.deletingCalendar = false;
      },
      error: (error) => {
        console.error('Error deleting calendar:', error);
        this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to delete calendar');
        this.deletingCalendar = false;
      }
    });
  }

  getWeekendDaysLabel(weekendDays: number[]): string {
    if (!weekendDays || weekendDays.length === 0) return 'None';
    return weekendDays
      .map(day => this.weekDays.find(d => d.value === day)?.label || '')
      .filter(label => label)
      .join(', ');
  }

  // ========================================
  // HOLIDAY MANAGEMENT
  // ========================================

  loadHolidays() {
    this.loadingHolidays = true;
    this.leaveService.getAllHolidays(this.selectedYear).subscribe({
      next: (response: any) => {
        this.holidays = response.holidays || [];
        this.loadingHolidays = false;
      },
      error: (error) => {
        console.error('Error loading holidays:', error);
        this.alertService.showAlert('error', 'Error', 'Failed to load holidays');
        this.loadingHolidays = false;
      }
    });
  }

  onYearChange() {
    this.loadHolidays();
  }

  openCreateHolidayModal() {
    this.isEditHolidayMode = false;
    this.resetHolidayForm();
    this.isHolidayModalOpen = true;
  }

  openEditHolidayModal(holiday: any) {
    this.isEditHolidayMode = true;
    this.holidayForm = {
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      description: holiday.description || '',
      department: holiday.department || '',
      recurring: holiday.recurring || false
    };
    this.isHolidayModalOpen = true;
  }

  closeHolidayModal() {
    this.isHolidayModalOpen = false;
    this.resetHolidayForm();
  }

  resetHolidayForm() {
    this.holidayForm = {
      name: '',
      date: '',
      description: '',
      department: '',
      recurring: false
    };
  }

  saveHoliday() {
    if (!this.holidayForm.name || !this.holidayForm.date) {
      this.alertService.showAlert('error', 'Validation Error', 'Please fill in all required fields');
      return;
    }

    this.loadingHolidays = true;

    if (this.isEditHolidayMode) {
      this.leaveService.updateHoliday(this.holidayForm.id, this.holidayForm).subscribe({
        next: (response: any) => {
          this.alertService.showAlert('success', 'Success', 'Holiday updated successfully');
          this.loadHolidays();
          this.closeHolidayModal();
          this.loadingHolidays = false;
        },
        error: (error) => {
          console.error('Error updating holiday:', error);
          this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to update holiday');
          this.loadingHolidays = false;
        }
      });
    } else {
      this.leaveService.createHoliday(this.holidayForm).subscribe({
        next: (response: any) => {
          this.alertService.showAlert('success', 'Success', 'Holiday created successfully');
          this.loadHolidays();
          this.closeHolidayModal();
          this.loadingHolidays = false;
        },
        error: (error) => {
          console.error('Error creating holiday:', error);
          this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to create holiday');
          this.loadingHolidays = false;
        }
      });
    }
  }

  openDeleteHolidayModal(holiday: any) {
    this.deleteHolidayConfig = {
      title: 'Delete Holiday',
      message: `Are you sure you want to delete "${holiday.name}"? This action cannot be undone.`,
      holidayId: holiday.id,
      onConfirm: () => this.confirmDeleteHoliday(holiday.id)
    };
    this.showDeleteHolidayModal = true;
  }

  confirmDeleteHoliday(holidayId: number) {
    this.deletingHoliday = true;
    this.leaveService.deleteHoliday(holidayId).subscribe({
      next: (response: any) => {
        this.alertService.showAlert('success', 'Success', 'Holiday deleted successfully');
        this.loadHolidays();
        this.showDeleteHolidayModal = false;
        this.deletingHoliday = false;
      },
      error: (error) => {
        console.error('Error deleting holiday:', error);
        this.alertService.showAlert('error', 'Error', error.error?.message || 'Failed to delete holiday');
        this.deletingHoliday = false;
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getDayOfWeek(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
}
