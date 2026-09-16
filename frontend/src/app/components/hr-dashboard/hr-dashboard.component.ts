import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
 selector: 'app-hr-dashboard',
 standalone: true,
 imports: [CommonModule, RouterLink],
 templateUrl: './hr-dashboard.component.html',
 styleUrls: ['./hr-dashboard.component.css']
})
export class HrDashboardComponent implements OnInit {
 isLoading = true;

 stats = {
 totalEmployees: 0,
 newHires: 0,
 onLeave: 0,
 pendingLeave: 0,
 openPositions: 0,
 activeApplications: 0,
 nextPayrollDate: new Date('2025-12-25'),
 daysToPayroll: 0
 };

 recruitment = {
 applied: 0,
 screening: 0,
 interview: 0,
 offer: 0
 };

 actions: any[] = [];
 events: any[] = [];

 moduleCards = [
 {
 title: 'Employee Hub',
 description: 'Directory, org chart, approvals, and employee profile views.',
 accent: 'from-blue-500 to-cyan-500',
 icon: '👥'
 },
 {
 title: 'Leave & Attendance',
 description: 'Track requests, balances, clock-ins, and pending actions.',
 accent: 'from-violet-500 to-indigo-500',
 icon: '🗓️'
 },
 {
 title: 'Recruitment',
 description: 'Pipeline visibility, interviews, and hiring follow-up.',
 accent: 'from-emerald-500 to-green-500',
 icon: '✨'
 },
 {
 title: 'Payroll & Reports',
 description: 'Pay cycles, exports, and compliance-ready reporting.',
 accent: 'from-amber-500 to-orange-500',
 icon: '📊'
 }
 ];

 highlights = [
 'New employee onboarding flows are now live.',
 'Leave approvals and attendance summaries are now connected.',
 'HR dashboards are structured for a more complete operational view.'
 ];

 constructor(private api: ApiService) { }

 ngOnInit(): void {
 this.loadDashboardData();
 }

 loadDashboardData() {
 this.isLoading = true;
 this.api.get('analytics/dashboard').subscribe({
 next: (data: any) => {
 this.stats = {
 totalEmployees: data.headcount || 0,
 newHires: data.newHires || 0,
 onLeave: data.leaveUtilization?.onLeaveToday || 0,
 pendingLeave: data.leaveUtilization?.pendingRequests || 0,
 openPositions: data.openPositions || 0,
 activeApplications: (data.recruitment?.applied || 0) + (data.recruitment?.screening || 0) + (data.recruitment?.interview || 0) + (data.recruitment?.offer || 0),
 nextPayrollDate: new Date(data.nextPayrollDate || '2025-12-25'),
 daysToPayroll: data.daysToPayroll || 0
 };

 if (data.recruitment) {
 this.recruitment = data.recruitment;
 }

 if (data.actions) {
 this.actions = data.actions;
 }

 if (data.events) {
 this.events = data.events;
 }

 this.isLoading = false;
 },
 error: (err) => {
 console.error('Failed to load HR dashboard data:', err);
 this.isLoading = false;
 }
 });
 }
}
