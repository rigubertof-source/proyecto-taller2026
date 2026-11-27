import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionDevoluciones } from './gestion-devoluciones';

describe('GestionDevoluciones', () => {
  let component: GestionDevoluciones;
  let fixture: ComponentFixture<GestionDevoluciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionDevoluciones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionDevoluciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
