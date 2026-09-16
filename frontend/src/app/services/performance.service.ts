import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
 providedIn: 'root',
})
export class PerformanceService {
 constructor(private api: ApiService) {}

 createGoal(goal: any) {
 return this.api.post('performance/goals', goal);
 }

 getMyPerformance() {
 return this.api.get('performance/my-performance');
 }

 getAllPerformance() {
 return this.api.get('performance/all');
 }

 getTeamPerformance() {
 return this.api.get('performance/team');
 }

 updatePerformance(id: any, updates: any) {
 return this.api.patch(`performance/${id}`, updates);
 }

 addFeedback(id: any, feedback: string) {
 return this.api.post(`performance/${id}/feedback`, { feedback });
 }
}
