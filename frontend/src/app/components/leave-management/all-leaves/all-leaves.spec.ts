import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllLeaves } from './all-leaves';

describe('AllLeaves', () => {
 let component: AllLeaves;
 let fixture: ComponentFixture<AllLeaves>;

 beforeEach(async () => {
 await TestBed.configureTestingModule({
 imports: [AllLeaves]
 })
 .compileComponents();

 fixture = TestBed.createComponent(AllLeaves);
 component = fixture.componentInstance;
 fixture.detectChanges();
 });

 it('should create', () => {
 expect(component).toBeTruthy();
 });
});
