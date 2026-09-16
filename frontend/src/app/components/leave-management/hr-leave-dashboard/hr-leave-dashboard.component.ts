import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LeaveService } from '../../../services/leave.service';
import { AlertService } from '../../../services/alert.service';

// Import Reusable Components
import { ButtonComponent } from '../../shared/button/button.component';
import { StatusBadgeComponent } from '../../shared/status-badge/status-badge.component';
import { SpinnerComponent } from '../../shared/spinner/spinner.component';
import { getLeaveStatusVariant } from '../../../utils/status.util';

@Component({
  selector: 'app-hr-leave-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    StatusBadgeComponent,
    SpinnerComponent
  ],
  templateUrl: './hr-leave-dashboard.component.html',
  styleUrl: './hr-leave-dashboard.component.css'
})
export class HrLeaveDashboardComponent implements OnInit {
  private leaveService = inject(LeaveService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  // Dashboard Stats
  dashboardStats: any = {
    totalRequests: 0,
    pendingCount: 0,
    approvedThisMonth: 0,
    onLeaveToday: 0,
    upcomingCount: 0,
    upcomingDays: 0,
    totalEmployees: 0,
    pendingTrend: 'neutral',
    pendingChange: 0,
    approvedTrend: 'neutral',
    approvedChange: 0
  };
  leaveUtilization: any[] = [];
  departmentStats: any[] = [];
  upcomingLeaves: any[] = [];
  balanceOverview: any[] = [];
  
  loading = false;
  loadingStats = false;
  loadingUpcoming = false;

  selectedYear: number = new Date().getFullYear();

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loadDashboardStats();
    this.loadLeaveUtilization();
    this.loadDepartmentStats();
    this.loadUpcomingLeaves();
    this.loadBalanceOverview();
  }

  loadDashboardStats() {
    console.log('=== Loading Dashboard Stats - START ===');
    this.loadingStats = true;
    this.leaveService.getDashboardStats().subscribe({
      next: (response: any) => {
        console.log('Dashboard stats response:', response);
        this.dashboardStats = { ...this.dashboardStats, ...response };
        this.loadingStats = false;
        console.log('Dashboard stats loaded successfully, loadingStats =', this.loadingStats);
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        console.error('Error status:', error.status);
        console.error('Error details:', error.error);
        // Keep existing default values, just stop loading
        this.loadingStats = false;
        console.log('Dashboard stats error, loadingStats =', this.loadingStats);
        this.alertService.showAlert('warning', 'Warning', 'Could not load all dashboard statistics');
      }
    });
  }

  loadLeaveUtilization() {
    this.leaveService.getLeaveUtilization(this.selectedYear).subscribe({
      next: (response: any) => {
        // Convert utilization object to array
        if (response && response.utilization && typeof response.utilization === 'object') {
          this.leaveUtilization = Object.values(response.utilization);
        } else if (Array.isArray(response)) {
          this.leaveUtilization = response;
        } else {
          this.leaveUtilization = [];
        }
        console.log('Utilization loaded:', this.leaveUtilization.length, 'types');
      },
      error: (error) => {
        console.error('Error loading utilization:', error);
        this.leaveUtilization = [];
      }
    });
  }

  loadDepartmentStats() {
    this.leaveService.getDepartmentStats(this.selectedYear).subscribe({
      next: (response: any) => {
        this.departmentStats = response.departments || response || [];
        console.log('Department stats loaded:', this.departmentStats.length, 'departments');
      },
      error: (error) => {
        console.error('Error loading department stats:', error);
        this.departmentStats = [];
      }
    });
  }

  loadUpcomingLeaves() {
    this.loadingUpcoming = true;
    this.leaveService.getUpcomingLeaves(30).subscribe({
      next: (response: any) => {
        this.upcomingLeaves = response.leaves || response || [];
        this.loadingUpcoming = false;
        console.log('Upcoming leaves loaded:', this.upcomingLeaves.length, 'leaves');
      },
      error: (error) => {
        console.error('Error loading upcoming leaves:', error);
        this.upcomingLeaves = [];
        this.loadingUpcoming = false;
      }
    });
  }

  loadBalanceOverview() {
    this.leaveService.getBalanceOverview().subscribe({
      next: (response: any) => {
        this.balanceOverview = response.overview || response || [];
        console.log('Balance overview loaded:', this.balanceOverview.length, 'records');
      },
      error: (error) => {
        console.error('Error loading balance overview:', error);
        this.balanceOverview = [];
      }
    });
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    this.loadLeaveUtilization();
    this.loadDepartmentStats();
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  getUtilizationPercentage(utilized: number, total: number): number {
    if (!total || total === 0) return 0;
    if (!utilized) return 0;
    return Math.round((utilized / total) * 100);
  }

  getUtilizationColor(percentage: number): string {
    if (percentage >= 80) return '#ef4444'; // Red
    if (percentage >= 60) return '#f59e0b'; // Orange
    if (percentage >= 40) return '#3b82f6'; // Blue
    return '#10b981'; // Green
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

  getStatusBadgeType(status: string) {
    return getLeaveStatusVariant(status);
  }

  getTrendIcon(trend: string): string {
    if (trend === 'up') return '↗️';
    if (trend === 'down') return '↘️';
    return '→';
  }

  getTrendClass(trend: string): string {
    if (trend === 'up') return 'trend-up';
    if (trend === 'down') return 'trend-down';
    return 'trend-neutral';
  }
}
