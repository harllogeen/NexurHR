import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../../services/loader.service';

@Component({
 selector: 'app-loader',
 standalone: true,
 imports: [CommonModule],
 templateUrl: './loader.html',
})
export class LoaderComponent {
 isLoading$;

 constructor(private loaderService: LoaderService) {
 this.isLoading$ = this.loaderService.isLoading$;
 }
}
