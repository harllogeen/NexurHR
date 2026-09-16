import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertService } from '../../../services/alert.service';

@Component({
 selector: 'app-alert',
 standalone: true,
 imports: [CommonModule],
 templateUrl: './alert.html',
})
export class AlertComponent {
 alert$;

 constructor(private alertService: AlertService) {
 this.alert$ = this.alertService.alert$;
 }

 close() {
 this.alertService.clear();
 }
}
