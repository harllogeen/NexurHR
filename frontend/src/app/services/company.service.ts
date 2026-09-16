import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
 providedIn: 'root',
})
export class CompanyService {
 constructor(private api: ApiService) {}

 getCompany() {
 return this.api.get('company');
 }

 updateCompany(data: any) {
 return this.api.put('company', data);
 }
}
