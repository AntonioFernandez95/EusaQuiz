import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignSubjectsComponent } from './assign-subjects.component';

describe('AssignSubjectsComponent', () => {
  let component: AssignSubjectsComponent;
  let fixture: ComponentFixture<AssignSubjectsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AssignSubjectsComponent]
    });
    fixture = TestBed.createComponent(AssignSubjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
