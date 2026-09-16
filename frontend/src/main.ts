import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Suppress web vitals errors from browser extensions/devtools
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('reportAllChanges')) {
    event.preventDefault();
    event.stopPropagation();
  }
  return true;
});

// Add polyfill for performance API if missing
if (typeof window !== 'undefined' && window.performance) {
  // Ensure navigation timing exists
  if (!window.performance.getEntriesByType) {
    (window.performance as any).getEntriesByType = () => [];
  }
  
  // Ensure timing exists with startTime
  if (window.performance.timing && !(window.performance.timing as any).startTime) {
    try {
      Object.defineProperty(window.performance.timing, 'startTime', {
        get: () => window.performance.timing.navigationStart || Date.now(),
        configurable: true
      });
    } catch (e) {
      // Silently fail if we can't define the property
    }
  }
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
