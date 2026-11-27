import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionProcesos } from './gestion-procesos';

describe('GestionProcesos', () => {
  let component: GestionProcesos;
  let fixture: ComponentFixture<GestionProcesos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionProcesos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionProcesos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
