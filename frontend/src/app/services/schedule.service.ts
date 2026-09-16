import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ScheduleService {
  constructor(private api: ApiService) {}

  getAllSchedules(params?: any): Observable<any> {
    let query = '';
    if (params) {
      const queryParams = new URLSearchParams(params).toString();
      query = queryParams ? `?${queryParams}` : '';
    }
    return this.api.get(`schedules${query}`);
  }

  getScheduleById(id: string): Observable<any> {
    return this.api.get(`schedules/${id}`);
  }

  getSchedulesByEmployee(employeeId: string, startDate?: string, endDate?: string): Observable<any> {
    let query = `employeeId=${employeeId}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;
    return this.api.get(`schedules?${query}`);
  }

  getSchedulesByDateRange(startDate: string, endDate: string, department?: string): Observable<any> {
    let query = `startDate=${startDate}&endDate=${endDate}`;
    if (department) query += `&department=${department}`;
    return this.api.get(`schedules?${query}`);
  }

  createSchedule(scheduleData: any): Observable<any> {
    return this.api.post('schedules', scheduleData);
  }

  updateSchedule(id: string, scheduleData: any): Observable<any> {
    return this.api.put(`schedules/${id}`, scheduleData);
  }

  deleteSchedule(id: string): Observable<any> {
    return this.api.delete(`schedules/${id}`);
  }

  autoGenerateSchedules(params: any): Observable<any> {
    return this.api.post('schedules/auto-generate', params);
  }

  clearSchedules(startDate: string, endDate: string, department?: string): Observable<any> {
    let query = `startDate=${startDate}&endDate=${endDate}`;
    if (department) query += `&department=${department}`;
    return this.api.delete(`schedules?${query}`);
  }
}
