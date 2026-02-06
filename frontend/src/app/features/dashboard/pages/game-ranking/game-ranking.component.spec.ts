import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameRankingComponent } from './game-ranking.component';

describe('GameRankingComponent', () => {
  let component: GameRankingComponent;
  let fixture: ComponentFixture<GameRankingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GameRankingComponent]
    });
    fixture = TestBed.createComponent(GameRankingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
