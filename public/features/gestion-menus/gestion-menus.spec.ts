import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionMenus } from './gestion-menus';

describe('GestionMenus', () => {
  let component: GestionMenus;
  let fixture: ComponentFixture<GestionMenus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionMenus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionMenus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
