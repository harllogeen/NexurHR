import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AvailabilityService {
  constructor(private api: ApiService) {}

  getMyAvailability(): Observable<any> {
    return this.api.get('availability/my');
  }

  getEmployeeAvailability(employeeId: string): Observable<any> {
    return this.api.get(`availability/${employeeId}`);
  }

  getAllAvailability(): Observable<any> {
    return this.api.get('availability');
  }

  createOrUpdateAvailability(availabilityData: any): Observable<any> {
    return this.api.post('availability', availabilityData);
  }

  deleteAvailability(id: string): Observable<any> {
    return this.api.delete(`availability/${id}`);
  }
}
