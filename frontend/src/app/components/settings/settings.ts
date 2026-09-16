import { AlertService } from '../../services/alert.service';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompanyService } from '../../services/company.service';
import { AuthService } from '../../services/auth.service';
import { IntegrationService } from '../../services/integration.service';

@Component({
 selector: 'app-settings',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './settings.html',
 styleUrl: './settings.css',
})
export class Settings implements OnInit {
  private alertService = inject(AlertService);
 user: any;
 company: any = {
 name: '',
 email: '',
 policies: {
 workingDays: [],
 workingHours: { start: '', end: '' },
 },
 };
 loading = false;
 integrations: any[] = [];
 integrationLoading = false;
 newWebhook = {
 url: '',
 event: 'employee.created',
 provider: 'custom',
 };
 demoEventName = 'employee.created';
 demoPayload = '{"employeeId":1,"status":"created"}';

 daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

 constructor(
 private companyService: CompanyService,
 private authService: AuthService,
 private integrationService: IntegrationService,
 ) {}

 ngOnInit() {
 this.authService.user$.subscribe((u) => {
 this.user = u;
 if (this.user && this.user.role === 'hr') {
 this.loadCompany();
 this.loadIntegrations();
 }
 });
 }

 loadCompany() {
 this.loading = true;
 this.companyService.getCompany().subscribe({
 next: (data: any) => {
 this.company = data;
 this.loading = false;
 },
 error: () => (this.loading = false),
 });
 }

 saveSettings() {
 this.loading = true;
 this.companyService.updateCompany(this.company).subscribe({
 next: () => {
 this.alertService.showAlert('success', 'Success', 'Settings saved successfully');
 this.loading = false;
 },
 error: (err) => {
 this.alertService.showAlert('error', 'Error', err.error.message || 'Error saving settings');
 this.loading = false;
 },
 });
 }

 loadIntegrations() {
 this.integrationLoading = true;
 this.integrationService.getWebhooks().subscribe({
 next: (data: any[]) => {
 this.integrations = data;
 this.integrationLoading = false;
 },
 error: () => {
 this.integrationLoading = false;
 },
 });
 }

 addWebhook() {
 if (!this.newWebhook.url || !this.newWebhook.event) {
 this.alertService.showAlert('error', 'Error', 'Please enter a webhook URL and event name');
 return;
 }

 this.integrationLoading = true;
 this.integrationService.createWebhook(this.newWebhook).subscribe({
 next: (webhook: any) => {
 this.integrations = [webhook, ...this.integrations];
 this.newWebhook = { url: '', event: 'employee.created', provider: 'custom' };
 this.integrationLoading = false;
 },
 error: (err) => {
 this.alertService.showAlert('error', 'Error', err.error?.message || 'Error creating webhook');
 this.integrationLoading = false;
 },
 });
 }

 dispatchDemoEvent() {
 let payload: any = {};
 try {
 payload = JSON.parse(this.demoPayload);
 } catch {
 payload = { message: this.demoPayload };
 }

 this.integrationLoading = true;
 this.integrationService.dispatchEvent(this.demoEventName, payload).subscribe({
 next: () => {
 this.alertService.showAlert('success', 'Success', 'Test event dispatched successfully');
 this.integrationLoading = false;
 },
 error: (err) => {
 this.alertService.showAlert('error', 'Error', err.error?.message || 'Error dispatching event');
 this.integrationLoading = false;
 },
 });
 }

 toggleDay(day: string) {
 const index = this.company.policies.workingDays.indexOf(day);
 if (index === -1) {
 this.company.policies.workingDays.push(day);
 } else {
 this.company.policies.workingDays.splice(index, 1);
 }
 }

 isDaySelected(day: string): boolean {
 return this.company.policies.workingDays.includes(day);
 }
}
