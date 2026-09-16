import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({
 providedIn: 'root',
})
export class IntegrationService {
 constructor(private api: ApiService) {}

 getWebhooks() {
 return this.api.get('integrations/webhooks');
 }

 createWebhook(payload: { url: string; event: string; provider?: string }) {
 return this.api.post('integrations/webhooks', payload);
 }

 dispatchEvent(event: string, payload?: any) {
 return this.api.post('integrations/events', { event, payload });
 }
}
