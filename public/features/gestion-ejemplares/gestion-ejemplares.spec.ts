import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionEjemplares } from './gestion-ejemplares';

describe('GestionEjemplares', () => {
  let component: GestionEjemplares;
  let fixture: ComponentFixture<GestionEjemplares>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionEjemplares]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionEjemplares);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
