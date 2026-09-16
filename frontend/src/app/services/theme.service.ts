import { Injectable, signal, effect, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
 providedIn: 'root'
})
export class ThemeService {
 // Signal to hold the current theme ('light' or 'dark')
 isDarkMode = signal<boolean>(false);
 private readonly THEME_KEY = 'nexus-hr-theme';

 constructor(@Inject(PLATFORM_ID) private platformId: Object) {
 if (isPlatformBrowser(this.platformId)) {
 this.initializeTheme();
 
 // Watch for signal changes to update the DOM
 effect(() => {
 const isDark = this.isDarkMode();
 this.applyTheme(isDark);
 localStorage.setItem(this.THEME_KEY, isDark ? 'dark' : 'light');
 });
 }
 }

 private initializeTheme() {
 // 1. Check local storage
 const storedTheme = localStorage.getItem(this.THEME_KEY);
 
 if (storedTheme) {
 this.isDarkMode.set(storedTheme === 'dark');
 } else {
 // 2. Check system preference
 const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
 this.isDarkMode.set(prefersDark);
 }
 }

 private applyTheme(isDark: boolean) {
 const htmlElement = document.documentElement;
 if (isDark) {
 htmlElement.classList.add('dark');
 } else {
 htmlElement.classList.remove('dark');
 }
 }

 toggleTheme() {
 this.isDarkMode.update(current => !current);
 }
}
