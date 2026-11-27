import { Component, DestroyRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Login } from '../auth/login/login/login';
import { AuthService, Data } from '../auth/auth.service';
import { Router, RouterOutlet } from "@angular/router";
import { MenuService } from '../../core/services/menu.service';
import { Menusi } from '../../core/model/menusModel';
import { RouterLink } from '@angular/router';
import { PersonasService } from '../../core/services/personas.service';
import { RolesService } from '../../core/services/roles.service';
import { Roles } from '../../core/model/usuarioModel';
import { urlFoto } from '../../core/utils/urlFoto';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-menu',
  imports: [FormsModule, RouterOutlet, Login, RouterLink],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu implements OnInit {
  private authService = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly PersonaService = inject(PersonasService);
  private readonly rolService = inject(RolesService);
  protected readonly urlFoto = urlFoto;
  private router = inject(Router);
  protected listaMenu: Menusi[] = [];
  private readonly destroyRef = inject(DestroyRef);

  roles: Roles[] = [];
  rolActual: Roles | null = null;

  userData: Data | null = null;
  mostrarLogin = false;
  nombre: string | undefined = this.userData?.nombre;

  mostrar(): void {
    this.menuService.getMenu().subscribe({
      next: (data) => {
        this.listaMenu = data;
        console.log('Menús:', this.listaMenu);
      },
    });
    console.log(this.listaMenu)
  }
  mostrarRol(codr: number): void {
  this.menuService.getMenuByRol(codr).subscribe({
    next: (data) => {
      this.listaMenu = data
        .filter(menu => menu.estado === 1)                      
        .map(menu => ({
          ...menu,
          procesos: (menu.procesos ?? []).filter(p => p.estado === 1),  
        }));
    },
  });
}
  ngOnInit(): void {
    this.rolService.roles$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((roles) => (this.roles = roles));

    this.rolService.rolActual$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rol) => {
        this.rolActual = rol;
        if (rol) this.mostrarRol(rol.codr);
        else this.listaMenu = [];
      });

    this.authService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.userData = data;
        if (data) {
          this.rolService.cargarRoles().subscribe();
        } else {
          this.rolService.limpiar();
          this.router.navigate(['/']);
        }
      });

    this.menuService.menuActualizado$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.rolActual) this.mostrarRol(this.rolActual.codr);
      });
  }
  
  fechaLiteral(): string | undefined {
    const fecha = this.userData?.fecha;
    if (!fecha) return undefined;
    const [year, month, day] = fecha.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const formatter = new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return formatter.format(date) ;
  }
  abrirLogin() {
    this.mostrarLogin = true;
  }
  cerrarLogin() {
    this.mostrarLogin = false;
  }
  cerrarSesion() {
    this.authService.clearSession();
  }
  isCollapsed = false;
  isMobileOpen = false;
  openMenu: string | null = null;
  toggleSidebar() {
    if (window.innerWidth <= 768) {
      this.isMobileOpen = !this.isMobileOpen;
    } else {
      this.isCollapsed = !this.isCollapsed;
    }
  }
  closeMobileSidebar() {
    if (window.innerWidth <= 768) {
      this.isMobileOpen = false;
    }
  }
  toggleSubmenu(menu: string) {
    this.openMenu = this.openMenu === menu ? null : menu;
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (event.target.innerWidth > 768) {
      this.isMobileOpen = false;
    }
  }
  openMenusa: number | null = null;

  toggleSubmenus(codm: number) {

    if (this.openMenusa === codm) {
      this.openMenusa = null;
    } else {
      this.openMenusa = codm;
    }
  }
  mostrarModalFoto = false;
  archivoSeleccionado: File | null = null;
  archivoNombre = '';
  previewUrl: string | null = null;
  guardando = false;

  abrirModalFoto() {
    this.limpiarSeleccion();
    this.mostrarModalFoto = true;
  }

  cerrarModalFoto() {
    this.mostrarModalFoto = false;
    this.limpiarSeleccion();
  }
  private limpiarSeleccion(): void {
    if (this.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = '';
    this.archivoSeleccionado = null;
    this.archivoNombre = '';
  }
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      return;
    }
    if (this.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(this.previewUrl);

    this.archivoSeleccionado = file;
    this.archivoNombre = file.name;
    this.previewUrl = URL.createObjectURL(file);
  }

  modificarFoto(): void {
    const codper = this.userData?.codper;
    if (!this.archivoSeleccionado || codper == null) return;

    this.guardando = true;
    this.PersonaService.subirFoto(codper, this.archivoSeleccionado).subscribe({
      next: (p) => {
        this.authService.actualizarFoto(p.foto ?? '');
        this.guardando = false;
        this.cerrarModalFoto();
      },
    });
  }

  cambiarRol(event: Event) {
  const codr = Number((event.target as HTMLSelectElement).value);
  this.openMenusa = null;
  this.rolService.seleccionar(codr);

  this.router.navigate(['/']);
}

}