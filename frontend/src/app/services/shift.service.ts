import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ShiftService {
  constructor(private api: ApiService) {}

  getAllShifts(): Observable<any> {
    return this.api.get('shifts');
  }

  getShiftById(id: string): Observable<any> {
    return this.api.get(`shifts/${id}`);
  }

  createShift(shiftData: any): Observable<any> {
    return this.api.post('shifts', shiftData);
  }

  updateShift(id: string, shiftData: any): Observable<any> {
    return this.api.put(`shifts/${id}`, shiftData);
  }

  deleteShift(id: string): Observable<any> {
    return this.api.delete(`shifts/${id}`);
  }

  toggleShiftStatus(id: string): Observable<any> {
    return this.api.patch(`shifts/${id}/toggle`, {});
  }
}
