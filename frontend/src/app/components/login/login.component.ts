import { Component, OnInit, OnDestroy, Renderer2, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

@Component({
 selector: 'app-login',
 standalone: true,
 imports: [CommonModule, FormsModule, RouterLink],
 templateUrl: './login.component.html',
 styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
 username = '';
 password = '';
 error = '';
 isLoading = false;
 sessionMessage = '';

 private mouseMoveListener: (() => void) | null = null;

 constructor(
 private auth: AuthService,
 private router: Router,
 private route: ActivatedRoute,
 private renderer: Renderer2,
 private el: ElementRef
 ) {}

 ngOnInit() {
   // Check for session expiry or unauthorized access
   this.route.queryParams.subscribe(params => {
     if (params['sessionExpired'] === 'true') {
       this.sessionMessage = 'Your session has expired. Please login again.';
     } else if (params['unauthorized'] === 'true') {
       this.sessionMessage = 'You are not authorized to access that resource. Please login.';
     }
   });

   // Add mouse move event listener for cursor-following effect
   this.mouseMoveListener = this.renderer.listen('document', 'mousemove', (e: MouseEvent) => {
     const loginPage = this.el.nativeElement.querySelector('.login-page');
     if (loginPage) {
       const x = (e.clientX / window.innerWidth) * 100;
       const y = (e.clientY / window.innerHeight) * 100;
       
       loginPage.style.setProperty('--mouse-x', `${x}%`);
       loginPage.style.setProperty('--mouse-y', `${y}%`);
     }
   });
 }

 ngOnDestroy() {
   // Clean up event listener
   if (this.mouseMoveListener) {
     this.mouseMoveListener();
   }
 }

 login() {
 this.isLoading = true;
 this.error = '';
 this.sessionMessage = '';
 const cleanUsername = this.username.trim();
 const cleanPassword = this.password.trim();

 this.auth.login({ username: cleanUsername, password: cleanPassword }).subscribe({
 next: (res) => {
 this.isLoading = false;
 if (res.role === 'hr') {
 this.router.navigate(['/dashboard/hr']);
 } else {
 this.router.navigate(['/dashboard/staff']);
 }
 },
 error: (err) => {
 this.isLoading = false;
 this.error = err.error.message || 'Login failed';
 },
 });
 }
}
