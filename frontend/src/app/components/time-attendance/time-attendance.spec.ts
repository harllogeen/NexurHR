import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeAttendance } from './time-attendance';

describe('TimeAttendance', () => {
 let component: TimeAttendance;
 let fixture: ComponentFixture<TimeAttendance>;

 beforeEach(async () => {
 await TestBed.configureTestingModule({
 imports: [TimeAttendance]
 })
 .compileComponents();

 fixture = TestBed.createComponent(TimeAttendance);
 component = fixture.componentInstance;
 fixture.detectChanges();
 });

 it('should create', () => {
 expect(component).toBeTruthy();
 });
});
