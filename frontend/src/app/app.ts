import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoaderComponent } from './components/shared/loader/loader.component';
import { AlertComponent } from './components/shared/alert/alert.component';
import { ModalComponent } from './components/shared/modal/modal.component';

@Component({
 selector: 'app-root',
 imports: [RouterOutlet, LoaderComponent, AlertComponent, ModalComponent],
 templateUrl: './app.html',
 styleUrl: './app.css'
})
export class App {
 protected readonly title = signal('frontend');
}
