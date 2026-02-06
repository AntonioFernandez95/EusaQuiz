import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessorDashboardComponent } from './professor-dashboard.component';

describe('ProfessorDashboardComponent', () => {
  let component: ProfessorDashboardComponent;
  let fixture: ComponentFixture<ProfessorDashboardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProfessorDashboardComponent]
    });
    fixture = TestBed.createComponent(ProfessorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
