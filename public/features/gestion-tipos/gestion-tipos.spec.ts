import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionTipos } from './gestion-tipos';

describe('GestionTipos', () => {
  let component: GestionTipos;
  let fixture: ComponentFixture<GestionTipos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionTipos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionTipos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
