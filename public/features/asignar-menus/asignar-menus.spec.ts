import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsignarMenus } from './asignar-menus';

describe('AsignarMenus', () => {
  let component: AsignarMenus;
  let fixture: ComponentFixture<AsignarMenus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsignarMenus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsignarMenus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
