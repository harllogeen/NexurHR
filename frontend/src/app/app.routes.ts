import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { StaffDashboardComponent } from './components/staff-dashboard/staff-dashboard.component';
import { HrDashboardComponent } from './components/hr-dashboard/hr-dashboard.component';
import { LayoutComponent } from './components/layout/layout.component';
import { AuthGuard } from './auth.guard';
import { LandingComponent } from './components/landing/landing';
import { RegisterComponent } from './components/register/register';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password';
import { Employees } from './components/employees/employees';
import { Recruitment } from './components/recruitment/recruitment';
import { Payroll } from './components/payroll/payroll';
import { Performance } from './components/performance/performance';
import { Training } from './components/training/training';
import { Reports } from './components/reports/reports';
import { Settings } from './components/settings/settings';
import { TimeAttendance } from './components/time-attendance/time-attendance';
import { MyAttendanceComponent } from './components/my-attendance/my-attendance';
import { TeamsAttendanceComponent } from './components/teams-attendance/teams-attendance';
import { LeaveRequestComponent } from './components/leave-management/leave-request/leave-request';
import { AllLeavesComponent } from './components/leave-management/all-leaves/all-leaves';
import { LeavePolicyComponent } from './components/leave-management/leave-policy/leave-policy.component';
import { WorkCalendarComponent } from './components/leave-management/work-calendar/work-calendar.component';
import { ApprovalWorkflowComponent } from './components/leave-management/approval-workflow/approval-workflow.component';
import { HrLeaveDashboardComponent } from './components/leave-management/hr-leave-dashboard/hr-leave-dashboard.component';
import { TeamLeaveApprovalComponent } from './components/leave-management/team-leave-approval/team-leave-approval.component';
import { LeaveCalendarComponent } from './components/leave-management/leave-calendar/leave-calendar.component';
import { BalanceManagementComponent } from './components/leave-management/balance-management/balance-management.component';
import { EmployeeProfileComponent } from './components/employee-profile/employee-profile.component';
import { TaskManagement } from './components/task-management/task-management';
import { MyTasks } from './components/my-tasks/my-tasks';
import { ProjectsComponent } from './components/projects/projects';
import { ShiftManagementComponent } from './components/shift-management/shift-management.component';
import { ScheduleBuilderComponent } from './components/schedule-builder/schedule-builder.component';
import { MyScheduleComponent } from './components/my-schedule/my-schedule.component';

export const routes: Routes = [
 { path: '', component: LandingComponent, pathMatch: 'full' },
 { path: 'login', component: LoginComponent },
 { path: 'register', component: RegisterComponent },
 { path: 'forgot-password', component: ForgotPasswordComponent },
 {
 path: 'dashboard',
 component: LayoutComponent,
 canActivate: [AuthGuard],
 children: [
 {
 path: 'employee',
 component: StaffDashboardComponent,
 canActivate: [AuthGuard],
 data: { roles: ['employee', 'staff', 'manager', 'supervisor', 'accountant', 'cto'] },
 },
 {
 path: 'staff',
 redirectTo: 'employee',
 pathMatch: 'full',
 },
 {
 path: 'hr',
 canActivate: [AuthGuard],
 data: { roles: ['hr'] },
 children: [
 { path: '', component: HrDashboardComponent },
 { path: 'recruitment', component: Recruitment },
 { path: 'payroll', component: Payroll },
 { path: 'training', component: Training },
 { path: 'reports', component: Reports },
 { path: 'settings', component: Settings },
 ],
 },
 {
 path: 'performance',
 component: Performance,
 canActivate: [AuthGuard],
 data: { roles: ['hr', 'manager', 'employee', 'staff', 'supervisor', 'accountant', 'cto'] },
 },
 {
 path: 'employees',
 redirectTo: 'employees/all',
 pathMatch: 'full'
 },
 {
 path: 'employees/:view',
 component: Employees,
 canActivate: [AuthGuard],
 data: { roles: ['hr', 'super-admin', 'cto'] }
 },
 {
 path: 'time-attendance',
 component: TimeAttendance,
 canActivate: [AuthGuard],
 data: { roles: ['hr', 'manager', 'employee', 'staff', 'supervisor', 'accountant', 'cto'] },
 },
 {
 path: 'my-attendance',
 component: MyAttendanceComponent,
 canActivate: [AuthGuard],
 data: { roles: ['hr', 'manager', 'employee', 'staff', 'supervisor', 'accountant', 'cto'] },
 },
 {
 path: 'teams-attendance',
 component: TeamsAttendanceComponent,
 canActivate: [AuthGuard],
 data: { roles: ['hr'] },
 },
 {
 path: 'shift-management',
 component: ShiftManagementComponent,
 canActivate: [AuthGuard],
 data: { roles: ['hr'] },
 },
 {
 path: 'schedule-builder',
 component: ScheduleBuilderComponent,
 canActivate: [AuthGuard],
 data: { roles: ['hr', 'manager', 'supervisor'] },
 },
 {
 path: 'my-schedule',
 component: MyScheduleComponent,
 canActivate: [AuthGuard],
 data: { roles: ['hr', 'manager', 'employee', 'staff', 'supervisor', 'accountant', 'cto'] },
 },
 {
 path: 'leave',
 canActivate: [AuthGuard],
 data: { roles: ['hr', 'manager', 'employee', 'staff', 'supervisor', 'accountant', 'cto'] },
 children: [
 { path: '', redirectTo: 'request', pathMatch: 'full' },
 { path: 'request', component: LeaveRequestComponent },
 { path: 'team-approvals', component: TeamLeaveApprovalComponent },
 { path: 'all-applications', component: AllLeavesComponent },
 { 
   path: 'dashboard', 
   component: HrLeaveDashboardComponent,
   canActivate: [AuthGuard],
   data: { roles: ['hr', 'admin', 'super-admin'] }
 },
 { 
   path: 'policies', 
   component: LeavePolicyComponent,
   canActivate: [AuthGuard],
   data: { roles: ['hr', 'admin', 'super-admin'] }
 },
 { 
   path: 'work-calendar', 
   component: WorkCalendarComponent,
   canActivate: [AuthGuard],
   data: { roles: ['hr', 'admin', 'super-admin'] }
 },
 { 
   path: 'approval-workflows', 
   component: ApprovalWorkflowComponent,
   canActivate: [AuthGuard],
   data: { roles: ['hr', 'admin', 'super-admin'] }
 },
 { 
   path: 'calendar', 
   component: LeaveCalendarComponent,
   canActivate: [AuthGuard],
   data: { roles: ['hr', 'manager', 'supervisor'] }
 },
 { 
   path: 'balance-management', 
   component: BalanceManagementComponent,
   canActivate: [AuthGuard],
   data: { roles: ['hr', 'admin', 'super-admin'] }
 },
 ],
 },
 {
 path: 'employee-profile',
 component: EmployeeProfileComponent,
 canActivate: [AuthGuard],
 },
 {
 path: 'my-payroll',
 component: Payroll,
 canActivate: [AuthGuard],
 data: { roles: ['hr', 'manager', 'employee', 'staff', 'supervisor', 'accountant', 'cto'] },
 },
 {
 path: 'supervisor',
 component: StaffDashboardComponent,
 canActivate: [AuthGuard],
 data: { roles: ['supervisor'] },
 },
 {
 path: 'manager',
 component: StaffDashboardComponent,
 canActivate: [AuthGuard],
 data: { roles: ['manager'] },
 },
 {
 path: 'accountant',
 component: StaffDashboardComponent,
 canActivate: [AuthGuard],
 data: { roles: ['accountant'] },
 },
 {
 path: 'cto',
 component: StaffDashboardComponent,
 canActivate: [AuthGuard],
 data: { roles: ['cto'] },
 },
 {
 path: 'tasks',
 component: TaskManagement,
 canActivate: [AuthGuard],
 data: { roles: ['hr', 'manager', 'supervisor', 'cto'] },
 },
 {
 path: 'team',
 component: Employees,
 canActivate: [AuthGuard],
 data: { roles: ['supervisor', 'cto', 'accountant', 'staff'] },
 },
 {
 path: 'my-tasks',
 component: MyTasks,
 canActivate: [AuthGuard],
 },
 {
 path: 'projects',
 component: ProjectsComponent,
 canActivate: [AuthGuard],
 data: { roles: ['hr', 'manager', 'supervisor', 'cto', 'employee', 'staff', 'accountant'] },
 },
 { path: '', redirectTo: 'employee', pathMatch: 'full' },
 ],
 },
 { path: '**', redirectTo: '' },
];
