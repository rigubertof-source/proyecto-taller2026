import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsignarProcesos } from './asignar-procesos';

describe('AsignarProcesos', () => {
  let component: AsignarProcesos;
  let fixture: ComponentFixture<AsignarProcesos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsignarProcesos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsignarProcesos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
