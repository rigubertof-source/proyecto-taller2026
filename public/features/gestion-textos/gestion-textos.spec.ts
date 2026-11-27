import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionTextos } from './gestion-textos';

describe('GestionTextos', () => {
  let component: GestionTextos;
  let fixture: ComponentFixture<GestionTextos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionTextos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionTextos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
