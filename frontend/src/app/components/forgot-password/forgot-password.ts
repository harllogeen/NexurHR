import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
 selector: 'app-forgot-password',
 standalone: true,
 imports: [CommonModule, FormsModule, RouterLink],
 templateUrl: './forgot-password.html',
 styleUrl: './forgot-password.css',
})
export class ForgotPasswordComponent {
 email = '';
 isLoading = false;
 successMessage = '';
 errorMessage = '';

 onSubmit() {
 this.isLoading = true;
 this.successMessage = '';
 this.errorMessage = '';

 // Mock API call
 setTimeout(() => {
 this.isLoading = false;
 this.successMessage = 'If an account exists with this email, you will receive a password reset link.';
 }, 1500);
 }
}
