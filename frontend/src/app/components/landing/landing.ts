import { Component, HostListener, inject, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
 selector: 'app-landing',
 imports: [CommonModule, RouterLink],
 templateUrl: './landing.html',
 styleUrl: './landing.css',
})
export class LandingComponent implements OnInit, AfterViewInit {
 isMobileMenuOpen = false;
 isScrolled = false;
 themeService = inject(ThemeService);
 currentYear = new Date().getFullYear();

 @HostListener('window:scroll')
 onScroll() {
   this.isScrolled = window.scrollY > 20;
   this.animateOnScroll();
 }

 ngOnInit() {
   // Initialize animations
 }

 ngAfterViewInit() {
   // Trigger initial animation check
   setTimeout(() => this.animateOnScroll(), 100);
 }

 animateOnScroll() {
   const elements = document.querySelectorAll('.service-card, .feature-item, .testimonial-card, .stat-band-item');
   
   elements.forEach((element) => {
     const rect = element.getBoundingClientRect();
     const isVisible = rect.top < window.innerHeight * 0.85;
     
     if (isVisible && !element.classList.contains('animated')) {
       element.classList.add('animated');
       (element as HTMLElement).style.animation = 'fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both';
     }
   });
 }

 toggleMobileMenu() {
   this.isMobileMenuOpen = !this.isMobileMenuOpen;
 }

 closeMobileMenu() {
   this.isMobileMenuOpen = false;
 }
}
