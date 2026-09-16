import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  
  // Clone request and add token if available
  const authReq = token 
    ? req.clone({ headers: req.headers.set('x-access-token', token) })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Check for authentication/authorization errors
      if (error.status === 401 || error.status === 403) {
        console.log('Authentication error detected. Logging out...');
        
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login with appropriate message
        router.navigate(['/login'], {
          queryParams: { 
            sessionExpired: error.status === 401 ? 'true' : undefined,
            unauthorized: error.status === 403 ? 'true' : undefined
          }
        });
      }
      
      return throwError(() => error);
    })
  );
};
