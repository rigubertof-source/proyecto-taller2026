import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionAutores } from './gestion-autores';

describe('GestionAutores', () => {
  let component: GestionAutores;
  let fixture: ComponentFixture<GestionAutores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionAutores]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionAutores);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
