import { AlertService } from '../../services/alert.service';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../services/payroll.service';
import { PayrollConfigService } from '../../services/payroll-config.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
 selector: 'app-payroll',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './payroll.html',
 styleUrl: './payroll.css',
})
export class Payroll implements OnInit {
  private alertService = inject(AlertService);
 user: any;
 payrollData: any[] = [];
 employees: any[] = [];
 myPayslip: any = null;
 loading = false;

 // Pagination
 payrollPage = 1;
 pageSize = 10;

 get paginatedPayrollData(): any[] {
 const start = (this.payrollPage - 1) * this.pageSize;
 return this.payrollData.slice(start, start + this.pageSize);
 }

 get payrollTotalPages(): number {
 return Math.ceil(this.payrollData.length / this.pageSize) || 1;
 }

 goToPage(page: number) {
 this.payrollPage = Math.max(1, Math.min(page, this.payrollTotalPages));
 }

 getPageNumbers(totalPages: number): number[] {
 return Array.from({ length: totalPages }, (_, i) => i + 1);
 }

 // Filters
 selectedMonth: number = new Date().getMonth() + 1;
 selectedYear: number = new Date().getFullYear();
 months = [
 { value: 1, label: 'January' },
 { value: 2, label: 'February' },
 { value: 3, label: 'March' },
 { value: 4, label: 'April' },
 { value: 5, label: 'May' },
 { value: 6, label: 'June' },
 { value: 7, label: 'July' },
 { value: 8, label: 'August' },
 { value: 9, label: 'September' },
 { value: 10, label: 'October' },
 { value: 11, label: 'November' },
 { value: 12, label: 'December' },
 ];
 years: number[] = [];

 // Config Modal
 showConfigModal = false;
 selectedEmployee: any = null;
 employeeConfig: any = {
 loans: [],
 allowances: [],
 deductions: [],
 bonus: 0,
 overtimeRate: 1.5,
 latePenaltyPerMinute: 0,
 };

 // New item forms
 newLoan = { amount: 0, monthlyDeduction: 0, description: '' };
 newAllowance = { type: 'Housing', amount: 0, description: '' };
 newDeduction = { type: 'Tax', amount: 0, description: '', isPercentage: false };

 allowanceTypes = ['Housing', 'Transport', 'Medical', 'Meal', 'Communication', 'Other'];
 deductionTypes = ['Tax', 'Pension', 'Insurance', 'Union Dues', 'Other'];

 constructor(
 private payrollService: PayrollService,
 private payrollConfigService: PayrollConfigService,
 private authService: AuthService,
 private http: HttpClient,
 ) {
 const currentYear = new Date().getFullYear();
 for (let y = currentYear - 5; y <= currentYear + 1; y++) {
 this.years.push(y);
 }
 }

 ngOnInit() {
 this.authService.user$.subscribe((u) => {
 this.user = u;
 if (this.user) {
 if (this.user.role === 'hr' || this.user.role === 'accountant') {
 this.loadPayroll();
 this.loadEmployees();
 } else {
 this.loadMyPayslip();
 }
 }
 });
 }

 loadEmployees() {
 this.http.get<any[]>('http://localhost:3000/api/employees').subscribe({
 next: (data) => (this.employees = data),
 error: () => {},
 });
 }

 loadPayroll() {
 this.loading = true;
 this.payrollService.getPayrollData(this.selectedMonth, this.selectedYear).subscribe({
 next: (data: any) => {
 this.payrollData = data;
 this.loading = false;
 },
 error: () => (this.loading = false),
 });
 }

 loadMyPayslip() {
 this.loading = true;
 this.payrollService.getMyPayslip(this.selectedMonth, this.selectedYear).subscribe({
 next: (data: any) => {
 this.myPayslip = data;
 this.loading = false;
 },
 error: () => {
 this.myPayslip = null;
 this.loading = false;
 },
 });
 }

 onFilterChange() {
 if (this.user?.role === 'hr' || this.user?.role === 'accountant') {
 this.loadPayroll();
 } else {
 this.loadMyPayslip();
 }
 }

 generatePayroll() {
 this.loading = true;
 this.payrollService.generatePayroll(this.selectedMonth, this.selectedYear).subscribe({
 next: () => {
 this.loadPayroll();
 },
 error: (err) => {
 this.alertService.showAlert('error', 'Error', err.error.message || 'Error generating payroll');
 this.loading = false;
 },
 });
 }

 markAsPaid(item: any) {
 const today = new Date().toISOString().split('T')[0];
 this.payrollService.updatePayrollStatus(item.id, 'Paid', today).subscribe({
 next: (updated: any) => {
 item.status = updated.status;
 item.datePaid = updated.datePaid;
 },
 error: (err) => {
 this.alertService.showAlert('error', 'Error', err.error.message || 'Error updating status');
 },
 });
 }

 exportCSV() {
 this.payrollService.exportPayrollCSV(this.selectedMonth, this.selectedYear);
 }

 // Config Modal Methods
 openConfigModal(employee?: any) {
 if (employee) {
 this.selectedEmployee = employee;
 this.loadEmployeeConfig(employee.employeeId);
 } else {
 this.selectedEmployee = null;
 this.resetConfig();
 }
 this.showConfigModal = true;
 }

 closeConfigModal() {
 this.showConfigModal = false;
 this.selectedEmployee = null;
 this.resetConfig();
 }

 loadEmployeeConfig(employeeId: string | number) {
 this.payrollConfigService.getEmployeeConfig(employeeId).subscribe({
 next: (config: any) => {
 this.employeeConfig = {
 loans: config.loans || [],
 allowances: config.allowances || [],
 deductions: config.deductions || [],
 bonus: config.bonus || 0,
 overtimeRate: config.overtimeRate || 1.5,
 latePenaltyPerMinute: config.latePenaltyPerMinute || 0,
 };
 },
 error: () => this.resetConfig(),
 });
 }

 resetConfig() {
 this.employeeConfig = {
 loans: [],
 allowances: [],
 deductions: [],
 bonus: 0,
 overtimeRate: 1.5,
 latePenaltyPerMinute: 0,
 };
 this.newLoan = { amount: 0, monthlyDeduction: 0, description: '' };
 this.newAllowance = { type: 'Housing', amount: 0, description: '' };
 this.newDeduction = { type: 'Tax', amount: 0, description: '', isPercentage: false };
 }

 saveConfig() {
 if (!this.selectedEmployee) return;
 this.payrollConfigService
 .saveConfig(this.selectedEmployee.employeeId, this.employeeConfig)
 .subscribe({
 next: () => {
 this.closeConfigModal();
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error saving config'),
 });
 }

 addLoan() {
 if (!this.selectedEmployee || !this.newLoan.amount) return;
 this.payrollConfigService.addLoan(this.selectedEmployee.employeeId, this.newLoan).subscribe({
 next: (config: any) => {
 this.employeeConfig = config;
 this.newLoan = { amount: 0, monthlyDeduction: 0, description: '' };
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error adding loan'),
 });
 }

 addAllowance() {
 if (!this.selectedEmployee || !this.newAllowance.amount) return;
 this.payrollConfigService
 .addAllowance(this.selectedEmployee.employeeId, this.newAllowance)
 .subscribe({
 next: (config: any) => {
 this.employeeConfig = config;
 this.newAllowance = { type: 'Housing', amount: 0, description: '' };
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error adding allowance'),
 });
 }

 addDeduction() {
 if (!this.selectedEmployee || !this.newDeduction.amount) return;
 this.payrollConfigService
 .addDeduction(this.selectedEmployee.employeeId, this.newDeduction)
 .subscribe({
 next: (config: any) => {
 this.employeeConfig = config;
 this.newDeduction = { type: 'Tax', amount: 0, description: '', isPercentage: false };
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error adding deduction'),
 });
 }

 removeItem(itemType: string, itemId: number) {
 if (!this.selectedEmployee) return;
 this.payrollConfigService
 .removeItem(this.selectedEmployee.employeeId, itemType, itemId)
 .subscribe({
 next: (config: any) => {
 this.employeeConfig = config;
 },
 error: (err) => this.alertService.showAlert('error', 'Error', err.error?.message || 'Error removing item'),
 });
 }

 downloadPayslipPDF(item: any) {
 const printWindow = window.open('', '_blank');
 if (!printWindow) {
 this.alertService.showAlert('error', 'Error', 'Please allow popups for this site');
 return;
 }

 const html = `
 <!DOCTYPE html>
 <html>
 <head>
 <title>Payslip - ${item.name}</title>
 <style>
 body { font-family: 'Inter', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
 .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
 .header h1 { margin: 0; color: #1e40af; }
 .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
 .detail-block h4 { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 10px; }
 .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
 .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
 .table th { background: #f8f9fa; }
 .total-row { font-weight: bold; background: #e8f4fd; }
 .footer { text-align: center; color: #999; font-size: 11px; margin-top: 40px; }
 .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
 .status-paid { background: #dcfce7; color: #166534; }
 .status-pending { background: #fef3c7; color: #92400e; }
 @media print { body { padding: 20px; } }
 </style>
 </head>
 <body>
 <div class="header">
 <h1>PAYSLIP</h1>
 <p>${this.getMonthLabel(item.month)} ${item.year}</p>
 </div>
 <div class="details">
 <div class="detail-block">
 <h4>Employee</h4>
 <p><strong>${item.name}</strong></p>
 <p>ID: ${item.employeeId}</p>
 <p>Dept: ${item.department || 'N/A'}</p>
 </div>
 <div class="detail-block" style="text-align: right;">
 <h4>Status</h4>
 <p><span class="status ${item.status === 'Paid' ? 'status-paid' : 'status-pending'}">${item.status}</span></p>
 ${item.datePaid ? `<p>Paid: ${item.datePaid}</p>` : ''}
 </div>
 </div>
 <table class="table">
 <tr><th>Description</th><th style="text-align:right;">Amount (₦)</th></tr>
 <tr><td>Base Salary</td><td style="text-align:right;">${(item.baseSalary || 0).toLocaleString()}</td></tr>
 <tr><td>Days/Hours Worked</td><td style="text-align:right;">${item.daysWorked} days / ${item.hoursWorked || 0} hrs</td></tr>
 <tr><td>Allowances</td><td style="text-align:right;">+${(item.allowances || 0).toLocaleString()}</td></tr>
 <tr><td>Bonus</td><td style="text-align:right;">+${(item.bonus || 0).toLocaleString()}</td></tr>
 <tr><td><strong>Gross Pay</strong></td><td style="text-align:right;"><strong>${(item.grossPay || 0).toLocaleString()}</strong></td></tr>
 <tr><td>Loan Deduction</td><td style="text-align:right;">-${(item.loan || 0).toLocaleString()}</td></tr>
 <tr><td>Deductions</td><td style="text-align:right;">-${(item.deductions || 0).toLocaleString()}</td></tr>
 <tr><td>Late Penalty (${item.lateMinutes || 0} mins)</td><td style="text-align:right;">-${(item.latePenalty || 0).toLocaleString()}</td></tr>
 <tr class="total-row"><td><strong>Net Pay</strong></td><td style="text-align:right;"><strong>₦${(item.netPay || 0).toLocaleString()}</strong></td></tr>
 </table>
 <div class="footer">
 <p>Computer-generated document. Generated on ${new Date().toLocaleDateString()}</p>
 </div>
 </body>
 </html>
 `;

 printWindow.document.write(html);
 printWindow.document.close();
 setTimeout(() => printWindow.print(), 250);
 }

 getMonthLabel(month: number): string {
 return this.months.find((m) => m.value === month)?.label || '';
 }
}
