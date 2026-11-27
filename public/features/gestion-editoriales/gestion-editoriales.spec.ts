import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionEditoriales } from './gestion-editoriales';

describe('GestionEditoriales', () => {
  let component: GestionEditoriales;
  let fixture: ComponentFixture<GestionEditoriales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionEditoriales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionEditoriales);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
