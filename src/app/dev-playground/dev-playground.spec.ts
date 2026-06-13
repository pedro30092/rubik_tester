import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevPlayground } from './dev-playground';

describe('DevPlayground', () => {
  let component: DevPlayground;
  let fixture: ComponentFixture<DevPlayground>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevPlayground],
    }).compileComponents();

    fixture = TestBed.createComponent(DevPlayground);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
