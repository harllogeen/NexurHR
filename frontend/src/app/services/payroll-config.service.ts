import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
 providedIn: 'root',
})
export class PayrollConfigService {
 constructor(private api: ApiService) {}

 getAllConfigs() {
 return this.api.get('payroll-config');
 }

 getEmployeeConfig(employeeId: string | number) {
 return this.api.get(`payroll-config/${employeeId}`);
 }

 saveConfig(employeeId: string | number, config: any) {
 return this.api.put(`payroll-config/${employeeId}`, config);
 }

 addLoan(employeeId: string | number, loan: any) {
 return this.api.post(`payroll-config/${employeeId}/loan`, loan);
 }

 addAllowance(employeeId: string | number, allowance: any) {
 return this.api.post(`payroll-config/${employeeId}/allowance`, allowance);
 }

 addDeduction(employeeId: string | number, deduction: any) {
 return this.api.post(`payroll-config/${employeeId}/deduction`, deduction);
 }

 removeItem(employeeId: string | number, itemType: string, itemId: string | number) {
 return this.api.delete(`payroll-config/${employeeId}/${itemType}/${itemId}`);
 }
}
