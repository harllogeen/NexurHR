import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
 providedIn: 'root'
})
export class ProjectService {
 constructor(private api: ApiService) {}

 getProjects(view?: string) {
 let url = 'projects';
 if (view) {
 url += `?view=${view}`;
 }
 return this.api.get(url);
 }

 createProject(project: any) {
 return this.api.post('projects', project);
 }

 updateProject(id: string, updates: any) {
 return this.api.put(`projects/${id}`, updates);
 }

 deleteProject(id: string) {
 return this.api.delete(`projects/${id}`);
 }
}
