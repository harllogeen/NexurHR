import { AlertService } from '../../services/alert.service';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-dashboard.component.html',
  styleUrls: ['./staff-dashboard.component.css'],
})
export class StaffDashboardComponent implements OnInit, OnDestroy {
  private alertService = inject(AlertService);
  activities: any[] = [];
  newActivity = '';
  isLoading = false;
  user: any;
  currentDate: string = '';
  private dateInterval: any;
  
  dashboardStats: any = {
    employee: { 
      name: '', 
      firstName: '',
      lastName: '',
      department: '', 
      role: '',
      employeeId: null,
      id: null,
      profilePicture: null
    },
    attendance: { present: 0, late: 0, absent: 0, total: 0 },
    leave: { totalUsed: 0, totalAllowed: 20, remaining: 20 },
    latestPayslip: null,
    tasks: { pending: 0, completed: 0 },
    projects: { active: 0 },
    performance: { score: 0 }
  };

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.updateCurrentDate();
    this.dateInterval = setInterval(() => this.updateCurrentDate(), 60000); // Update every minute
    
    this.auth.user$.subscribe((u) => {
      this.user = u;
      if (this.user) {
        this.loadDashboardStats();
        this.loadActivities();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.dateInterval) {
      clearInterval(this.dateInterval);
    }
  }

  updateCurrentDate(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    this.currentDate = now.toLocaleDateString('en-US', options);
  }

  loadDashboardStats() {
    console.log('Loading dashboard stats for user:', this.user);
    console.log('Token:', localStorage.getItem('token'));
    
    this.api.get('employees/dashboard-stats').subscribe({
      next: (data: any) => {
        console.log('Dashboard stats loaded successfully:', data);
        this.dashboardStats = data;
      },
      error: (error) => {
        console.error('Failed to load dashboard stats. Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        
        // If 401/403, likely auth issue - but don't show scary modal
        if (error.status === 401 || error.status === 403) {
          console.log('Authentication error detected. Token may be expired.');
          // Optionally redirect to login
          // this.router.navigate(['/login']);
        }
      },
    });
  }

  loadActivities() {
    this.api.get('activities/my').subscribe({
      next: (data) => {
        this.activities = data.reverse();
      },
      error: () => {},
    });
  }

  logActivity() {
    if (!this.newActivity.trim()) return;

    this.isLoading = true;
    this.api.post('activities', { description: this.newActivity }).subscribe({
      next: () => {
        this.newActivity = '';
        this.isLoading = false;
        this.loadActivities();
        this.alertService.showAlert('success', 'Success', 'Activity logged successfully');
      },
      error: () => {
        this.isLoading = false;
        this.alertService.showAlert('error', 'Error', 'Failed to log activity');
      },
    });
  }

  goToProfile() {
    this.router.navigate(['/dashboard/employee-profile']);
  }

  goToLeaveManagement() {
    this.router.navigate(['/dashboard/leave']);
  }

  goToTimeAttendance() {
    this.router.navigate(['/dashboard/my-attendance']);
  }

  goToPayroll() {
    this.router.navigate(['/dashboard/my-payroll']);
  }

  goToTasks() {
    this.router.navigate(['/dashboard/my-tasks']);
  }
}
