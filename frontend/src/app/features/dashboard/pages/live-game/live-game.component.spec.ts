import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveGameComponent } from './live-game.component';

describe('LiveGameComponent', () => {
  let component: LiveGameComponent;
  let fixture: ComponentFixture<LiveGameComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LiveGameComponent]
    });
    fixture = TestBed.createComponent(LiveGameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
