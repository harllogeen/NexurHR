import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
 selector: 'app-employee-profile',
 standalone: true,
 imports: [CommonModule, FormsModule],
 templateUrl: './employee-profile.component.html',
 styleUrls: ['./employee-profile.component.css'],
})
export class EmployeeProfileComponent implements OnInit {
 profile: any = null;
 loading = false;
 updating = false;
 message = '';
 errorMessage = '';

 // Editable fields
 emergencyContact = { name: '', relationship: '', phone: '' };
 phone = '';
 personalEmail = '';

 // Password Change
 currentPassword = '';
 newPassword = '';
 confirmPassword = '';
 passwordMessage = '';
 changingPassword = false;

 baseUrl = '';

 constructor(
 private api: ApiService,
 private auth: AuthService,
 private router: Router,
 ) {
 this.baseUrl = this.api.getBaseUrl().replace('/api/', '/');
 }

 ngOnInit(): void {
 this.loadProfile();
 }

 loadProfile() {
 this.loading = true;
 this.api.get('employees/my-profile').subscribe({
 next: (data: any) => {
 this.profile = data;
 this.emergencyContact = data.emergencyContact || { name: '', relationship: '', phone: '' };
 this.phone = data.phone || '';
 this.personalEmail = data.personalEmail || '';
 this.loading = false;
 },
 error: (err) => {
 this.loading = false;
 this.errorMessage = err.error?.message || 'Failed to load profile. Please try again.';
 },
 });
 }

 updateProfile() {
 this.updating = true;
 this.message = '';

 const updates = {
 emergencyContact: this.emergencyContact,
 phone: this.phone,
 personalEmail: this.personalEmail,
 };

 this.api.patch('employees/my-profile', updates).subscribe({
 next: () => {
 this.updating = false;
 this.message = 'Profile updated successfully!';
 this.loadProfile();
 setTimeout(() => (this.message = ''), 3000);
 },
 error: () => {
 this.updating = false;
 this.message = 'Failed to update profile. Please try again.';
 },
 });
 }

 goBack() {
 // Navigate back to appropriate dashboard based on role
 this.router.navigate(['/dashboard/employee']);
 }

 changePassword() {
 this.changingPassword = true;
 this.passwordMessage = '';

 if (this.newPassword !== this.confirmPassword) {
 this.passwordMessage = 'Passwords do not match';
 this.changingPassword = false;
 return;
 }

 if (this.newPassword.length < 6) {
 this.passwordMessage = 'Password must be at least 6 characters long';
 this.changingPassword = false;
 return;
 }

 const data = {
 currentPassword: this.currentPassword,
 newPassword: this.newPassword,
 };

 this.auth.changePassword(data).subscribe({
 next: (res: any) => {
 this.passwordMessage = 'Password changed successfully';
 this.changingPassword = false;
 this.currentPassword = '';
 this.newPassword = '';
 this.confirmPassword = '';
 setTimeout(() => (this.passwordMessage = ''), 3000);
 },
 error: (err: any) => {
 this.passwordMessage = err.error?.message || 'Failed to change password';
 this.changingPassword = false;
 },
 });
 }

 onFileSelected(event: any) {
 const file = event.target.files[0];
 if (file) {
 this.uploadProfilePicture(file);
 }
 }

 uploadProfilePicture(file: File) {
 const formData = new FormData();
 formData.append('image', file);

 this.api.patchFile('employees/upload-profile-picture', formData).subscribe({
 next: (res: any) => {
 if (this.profile) {
 this.profile.profilePicture = res.profilePicture;
 }
 this.message = 'Profile picture updated successfully!';
 setTimeout(() => (this.message = ''), 3000);
 },
 error: (err: any) => {
 this.message = err.error?.message || 'Failed to upload profile picture';
 setTimeout(() => (this.message = ''), 3000);
 },
 });
 }
}
