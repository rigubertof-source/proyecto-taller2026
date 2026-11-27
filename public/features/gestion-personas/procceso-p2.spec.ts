import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProccesoP2 } from './procceso-p2';

describe('ProccesoP2', () => {
  let component: ProccesoP2;
  let fixture: ComponentFixture<ProccesoP2>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProccesoP2]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProccesoP2);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
