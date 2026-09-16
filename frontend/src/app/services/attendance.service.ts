import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
 providedIn: 'root',
})
export class AttendanceService {
 constructor(private api: ApiService) {}

 clockIn() {
 return this.api.post('attendance/clock-in', {});
 }

 clockOut() {
 return this.api.post('attendance/clock-out', {});
 }

 getMyAttendance() {
 return this.api.get('attendance/my-attendance');
 }

 getAllAttendance(params?: { 
   page?: number; 
   limit?: number; 
   search?: string; 
   department?: string;
   status?: string;
   startDate?: string;
   endDate?: string;
 }) {
   const queryParams = new URLSearchParams();
   if (params) {
     if (params.page) queryParams.append('page', params.page.toString());
     if (params.limit) queryParams.append('limit', params.limit.toString());
     if (params.search) queryParams.append('search', params.search);
     if (params.department) queryParams.append('department', params.department);
     if (params.status) queryParams.append('status', params.status);
     if (params.startDate) queryParams.append('startDate', params.startDate);
     if (params.endDate) queryParams.append('endDate', params.endDate);
   }
   const queryString = queryParams.toString();
   return this.api.get(`attendance/all${queryString ? '?' + queryString : ''}`);
 }

 getTeamAttendanceWithSchedule(date: string) {
 return this.api.get(`attendance/team-with-schedule?date=${date}`);
 }

 getAttendanceWithSchedule(employeeId: string, date: string) {
 return this.api.get(`attendance/with-schedule?employeeId=${employeeId}&date=${date}`);
 }

 getAttendanceWithScheduleByRange(employeeId: string, startDate: string, endDate: string) {
 return this.api.get(`attendance/range-with-schedule?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`);
 }
}
