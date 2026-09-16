import { Component, OnInit, OnDestroy, Renderer2, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
 selector: 'app-register',
 standalone: true,
 imports: [CommonModule, FormsModule, RouterLink],
 templateUrl: './register.html',
 styleUrl: './register.css',
})
export class RegisterComponent implements OnInit, OnDestroy {
 user = {
 username: '',
 email: '',
 password: '',
 role: 'employee' // Default role
 };
 isLoading = false;
 errorMessage = '';

 private mouseMoveListener: (() => void) | null = null;

 constructor(
   private auth: AuthService, 
   private router: Router,
   private renderer: Renderer2,
   private el: ElementRef
 ) {}

 ngOnInit() {
   // Add mouse move event listener for cursor-following effect
   this.mouseMoveListener = this.renderer.listen('document', 'mousemove', (e: MouseEvent) => {
     const registerPage = this.el.nativeElement.querySelector('.register-page');
     if (registerPage) {
       const x = (e.clientX / window.innerWidth) * 100;
       const y = (e.clientY / window.innerHeight) * 100;
       
       registerPage.style.setProperty('--mouse-x', `${x}%`);
       registerPage.style.setProperty('--mouse-y', `${y}%`);
     }
   });
 }

 ngOnDestroy() {
   // Clean up event listener
   if (this.mouseMoveListener) {
     this.mouseMoveListener();
   }
 }

 onSubmit() {
 this.isLoading = true;
 this.errorMessage = '';

 this.auth.register(this.user).subscribe({
 next: () => {
 this.isLoading = false;
 this.router.navigate(['/login']);
 },
 error: (err) => {
 this.isLoading = false;
 this.errorMessage = err.error?.message || 'Registration failed';
 }
 });
 }
}
