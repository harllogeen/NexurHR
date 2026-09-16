import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class LeaveService {
  constructor(private api: ApiService) {}

  // ========================================
  // LEAVE REQUEST ENDPOINTS
  // ========================================

  requestLeave(leaveRequest: any) {
    return this.api.post('leaves/request', leaveRequest);
  }

  getMyLeaves() {
    return this.api.get('leaves/my-leaves');
  }

  getMyApprovals(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.append(key, params[key]);
        }
      });
    }
    return this.api.get(`leaves/my-approvals${httpParams.toString() ? '?' + httpParams.toString() : ''}`);
  }

  getAllLeaves(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key]) params.append(key, filters[key]);
      });
    }
    return this.api.get(`leaves/all${params.toString() ? '?' + params.toString() : ''}`);
  }

  updateLeaveStatus(id: any, action: string, comments?: string) {
    return this.api.patch(`leaves/update-status/${id}`, { action, comments });
  }

  cancelLeaveRequest(id: any, reason?: string) {
    return this.api.patch(`leaves/cancel/${id}`, { reason });
  }

  deleteLeaveRequest(id: any) {
    return this.api.delete(`leaves/${id}`);
  }

  // ========================================
  // LEAVE POLICY ENDPOINTS
  // ========================================

  getAllPolicies() {
    return this.api.get('leave-policies/all');
  }

  getActivePolicies() {
    return this.api.get('leave-policies/active');
  }

  getEligiblePolicies() {
    return this.api.get('leave-policies/eligible');
  }

  getPolicyById(id: number) {
    return this.api.get(`leave-policies/${id}`);
  }

  getPolicyByCode(code: string) {
    return this.api.get(`leave-policies/code/${code}`);
  }

  checkPolicyEligibility(policyId: number) {
    return this.api.get(`leave-policies/${policyId}/eligibility`);
  }

  createPolicy(policyData: any) {
    return this.api.post('leave-policies', policyData);
  }

  updatePolicy(id: number, updates: any) {
    return this.api.patch(`leave-policies/${id}`, updates);
  }

  deletePolicy(id: number) {
    return this.api.delete(`leave-policies/${id}`);
  }

  // ========================================
  // LEAVE BALANCE ENDPOINTS
  // ========================================

  getMyBalance() {
    return this.api.get('leave-balances/my-balance');
  }

  getUserBalance(userId: number) {
    return this.api.get(`leave-balances/${userId}`);
  }

  getAllBalances() {
    return this.api.get('leave-balances/all');
  }

  getAdjustmentHistory(userId: number) {
    return this.api.get(`leave-balances/adjustments/${userId}`);
  }

  getAllAdjustments(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return this.api.get(`leave-balances/adjustments${params.toString() ? '?' + params.toString() : ''}`);
  }

  initializeBalance(userId: number, joiningDate?: string) {
    return this.api.post('leave-balances/initialize', { userId, joiningDate });
  }

  adjustBalance(userId: number, leaveType: string, newBalance: number, reason: string) {
    return this.api.post('leave-balances/adjust', { userId, leaveType, newBalance, reason });
  }

  processAccrual(userId: number) {
    return this.api.post(`leave-balances/accrual/${userId}`, {});
  }

  processCarryOver(userId: number, year: number) {
    return this.api.post('leave-balances/carry-over', { userId, year });
  }

  bulkProcessAccruals() {
    return this.api.post('leave-balances/bulk-accruals', {});
  }

  // ========================================
  // WORK CALENDAR ENDPOINTS
  // ========================================

  getAllCalendars() {
    return this.api.get('work-calendar/calendars/all');
  }

  getDefaultCalendar() {
    return this.api.get('work-calendar/calendars/default');
  }

  getCalendarById(id: number) {
    return this.api.get(`work-calendar/calendars/${id}`);
  }

  getCalendarByDepartment(department: string) {
    return this.api.get(`work-calendar/calendars/department/${department}`);
  }

  calculateWorkingDays(startDate: string, endDate: string, calendarId?: number, excludeHolidays = true) {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    if (calendarId) params.append('calendarId', calendarId.toString());
    params.append('excludeHolidays', excludeHolidays.toString());
    return this.api.get(`work-calendar/calculate-working-days?${params.toString()}`);
  }

  createCalendar(calendarData: any) {
    return this.api.post('work-calendar/calendars', calendarData);
  }

  updateCalendar(id: number, updates: any) {
    return this.api.patch(`work-calendar/calendars/${id}`, updates);
  }

  deleteCalendar(id: number) {
    return this.api.delete(`work-calendar/calendars/${id}`);
  }

  // Public Holidays
  getAllHolidays(year?: number, department?: string) {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (department) params.append('department', department);
    return this.api.get(`work-calendar/holidays${params.toString() ? '?' + params.toString() : ''}`);
  }

  getHolidaysByDateRange(startDate: string, endDate: string) {
    const params = new URLSearchParams();
    params.append('startDate', startDate);
    params.append('endDate', endDate);
    return this.api.get(`work-calendar/holidays/range?${params.toString()}`);
  }

  createHoliday(holidayData: any) {
    return this.api.post('work-calendar/holidays', holidayData);
  }

  updateHoliday(id: number, updates: any) {
    return this.api.patch(`work-calendar/holidays/${id}`, updates);
  }

  deleteHoliday(id: number) {
    return this.api.delete(`work-calendar/holidays/${id}`);
  }

  // ========================================
  // APPROVAL WORKFLOW ENDPOINTS
  // ========================================

  getAllWorkflows() {
    return this.api.get('approval-workflows/all');
  }

  getActiveWorkflows() {
    return this.api.get('approval-workflows/active');
  }

  getDefaultWorkflow() {
    return this.api.get('approval-workflows/default');
  }

  getWorkflowById(id: number) {
    return this.api.get(`approval-workflows/${id}`);
  }

  findMatchingWorkflow(leaveType: string, days: number, department?: string, role?: string, grade?: string) {
    return this.api.post('approval-workflows/find-match', { leaveType, days, department, role, grade });
  }

  createWorkflow(workflowData: any) {
    return this.api.post('approval-workflows', workflowData);
  }

  updateWorkflow(id: number, updates: any) {
    return this.api.patch(`approval-workflows/${id}`, updates);
  }

  deleteWorkflow(id: number) {
    return this.api.delete(`approval-workflows/${id}`);
  }

  // ========================================
  // LEAVE ANALYTICS ENDPOINTS
  // ========================================

  getDashboardStats() {
    return this.api.get('leave-analytics/dashboard-stats');
  }

  getLeaveUtilization(year?: number) {
    const params = year ? `?year=${year}` : '';
    return this.api.get(`leave-analytics/utilization${params}`);
  }

  getDepartmentStats(year?: number) {
    const params = year ? `?year=${year}` : '';
    return this.api.get(`leave-analytics/department-stats${params}`);
  }

  getMonthlyTrends(year?: number) {
    const params = year ? `?year=${year}` : '';
    return this.api.get(`leave-analytics/monthly-trends${params}`);
  }

  getEmployeeLeaveSummary(year?: number) {
    const params = year ? `?year=${year}` : '';
    return this.api.get(`leave-analytics/employee-summary${params}`);
  }

  getUpcomingLeaves(days = 30) {
    return this.api.get(`leave-analytics/upcoming?days=${days}`);
  }

  getBalanceOverview() {
    return this.api.get('leave-analytics/balance-overview');
  }

  // ========================================
  // LEAVE AUTOMATION ENDPOINTS
  // ========================================

  getAutomationStatus() {
    return this.api.get('leave-automation/status');
  }

  triggerDailyAccruals() {
    return this.api.post('leave-automation/trigger/accruals', {});
  }

  triggerYearEndCarryOver() {
    return this.api.post('leave-automation/trigger/year-end-carryover', {});
  }

  triggerStaleLeaveCleanup() {
    return this.api.post('leave-automation/trigger/stale-cleanup', {});
  }

  triggerApprovalReminders() {
    return this.api.post('leave-automation/trigger/approval-reminders', {});
  }

  triggerLowBalanceCheck() {
    return this.api.post('leave-automation/trigger/low-balance-check', {});
  }

  triggerUpcomingLeaveNotifications() {
    return this.api.post('leave-automation/trigger/upcoming-leave-notifications', {});
  }

  triggerAllAutomation() {
    return this.api.post('leave-automation/trigger/all', {});
  }
}
