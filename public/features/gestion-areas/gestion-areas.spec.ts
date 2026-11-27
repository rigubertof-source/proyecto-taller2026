import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionAreas } from './gestion-areas';

describe('GestionAreas', () => {
  let component: GestionAreas;
  let fixture: ComponentFixture<GestionAreas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionAreas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionAreas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
