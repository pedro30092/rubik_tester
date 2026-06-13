import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanvasBox } from './canvas-box';

describe('CanvasBox', () => {
  let component: CanvasBox;
  let fixture: ComponentFixture<CanvasBox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasBox],
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasBox);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
