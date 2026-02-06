import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportQuestionsComponent } from './import-questions.component';

describe('ImportQuestionsComponent', () => {
  let component: ImportQuestionsComponent;
  let fixture: ComponentFixture<ImportQuestionsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ImportQuestionsComponent]
    });
    fixture = TestBed.createComponent(ImportQuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
