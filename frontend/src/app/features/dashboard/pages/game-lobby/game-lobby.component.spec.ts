import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameLobbyComponent } from './game-lobby.component';

describe('GameLobbyComponent', () => {
  let component: GameLobbyComponent;
  let fixture: ComponentFixture<GameLobbyComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GameLobbyComponent]
    });
    fixture = TestBed.createComponent(GameLobbyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
