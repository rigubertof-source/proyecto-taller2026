import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BusquedaEjemplares } from './busqueda-ejemplares';

describe('BusquedaEjemplares', () => {
  let component: BusquedaEjemplares;
  let fixture: ComponentFixture<BusquedaEjemplares>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusquedaEjemplares]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BusquedaEjemplares);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
