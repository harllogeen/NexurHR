import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
 providedIn: 'root',
})
export class PayrollService {
 constructor(private api: ApiService) {}

 generatePayroll(month?: number, year?: number) {
 let url = 'payroll/generate';
 if (month && year) url += `?month=${month}&year=${year}`;
 return this.api.get(url);
 }

 getPayrollData(month?: number, year?: number) {
 let url = 'payroll/data';
 if (month && year) url += `?month=${month}&year=${year}`;
 return this.api.get(url);
 }

 updatePayrollStatus(id: string | number, status: string, datePaid?: string) {
 return this.api.patch(`payroll/${id}/status`, { status, datePaid });
 }

 exportPayrollCSV(month?: number, year?: number) {
 const token = localStorage.getItem('token');
 let url = `${this.api.getBaseUrl()}payroll/export?token=${token}`;
 if (month && year) url += `&month=${month}&year=${year}`;
 window.open(url, '_blank');
 }

 getMyPayslip(month?: number, year?: number) {
 let url = 'payroll/my-payslip';
 if (month && year) url += `?month=${month}&year=${year}`;
 return this.api.get(url);
 }
}
