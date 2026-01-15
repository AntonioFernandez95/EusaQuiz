import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentLobbyComponent } from './student-lobby.component';

describe('StudentLobbyComponent', () => {
  let component: StudentLobbyComponent;
  let fixture: ComponentFixture<StudentLobbyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StudentLobbyComponent]
    });
    fixture = TestBed.createComponent(StudentLobbyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
