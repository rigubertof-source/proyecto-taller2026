import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnularDevoluciones } from './anular-devoluciones';

describe('AnularDevoluciones', () => {
  let component: AnularDevoluciones;
  let fixture: ComponentFixture<AnularDevoluciones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnularDevoluciones]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnularDevoluciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
