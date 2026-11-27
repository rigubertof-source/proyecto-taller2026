// asignar-menus.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Menu } from '../../core/model/menusModel';
import { RolesService } from '../../core/services/roles.service';
import { MenuService } from '../../core/services/menu.service';
import { Roles } from '../../core/model/usuarioModel';

export interface RolConMenus extends Roles {
  menus: Menu[];
}

@Component({
  selector: 'app-asignar-menus',
  imports: [CommonModule, FormsModule],
  templateUrl: './asignar-menus.html',
  styleUrl: './asignar-menus.css',
})
export class AsignarMenus implements OnInit {
  private rolesService = inject(RolesService);
  private menusService = inject(MenuService);

  
  listaRoles: RolConMenus[] = [];
  listaMenusOriginales: Menu[] = [];
  listaMenusFiltrados: Menu[] = [];

  rolSeleccionado: RolConMenus | null = null;
  menusSeleccionados: Set<number> = new Set<number>();

  filtroRol = '';
  filtroMenu = '';
  filtroAsignacion: 'todos' | 'asignados' | 'noAsignados' = 'todos';

  paginaRolActual = 1;
  itemsPorPaginaRol = 5;

  paginaMenuActual = 1;
  itemsPorPaginaMenu = 5;

  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'ok' | 'error' = 'ok';
  private toastTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.rolesService.getRoles().subscribe(data => {
      this.listaRoles = data as unknown as RolConMenus[];
      if (this.rolSeleccionado) {
        const actualizado = this.listaRoles.find(r => r.codr === this.rolSeleccionado!.codr);
        if (actualizado) this.seleccionarRol(actualizado);
      }
    });

    this.menusService.getMenus().subscribe(data => {
      this.listaMenusOriginales = data;
      this.aplicarFiltrosMenus();
    });
  }

  get rolesPaginados(): RolConMenus[] {
    const filtrados = this.listaRoles.filter(r =>
      r.nombre.toLowerCase().includes(this.filtroRol.toLowerCase())
    );
    const inicio = (this.paginaRolActual - 1) * this.itemsPorPaginaRol;
    return filtrados.slice(inicio, inicio + this.itemsPorPaginaRol);
  }

  get totalPaginasRol(): number {
    const filtrados = this.listaRoles.filter(r =>
      r.nombre.toLowerCase().includes(this.filtroRol.toLowerCase())
    );
    return Math.ceil(filtrados.length / this.itemsPorPaginaRol) || 1;
  }

  seleccionarRol(rol: RolConMenus): void {
    this.rolSeleccionado = rol;
    this.menusSeleccionados.clear();
    if (rol.menus && rol.menus.length > 0) {
      rol.menus.forEach(m => this.menusSeleccionados.add(m.codm!));
    }
    this.aplicarFiltrosMenus();
  }

  aplicarFiltrosMenus(): void {
    let filtrados = [...this.listaMenusOriginales];

    if (this.filtroMenu.trim()) {
      filtrados = filtrados.filter(m =>
        m.nombre.toLowerCase().includes(this.filtroMenu.toLowerCase())
      );
    }

    if (this.filtroAsignacion === 'asignados') {
      filtrados = filtrados.filter(m => this.menusSeleccionados.has(m.codm!));
    } else if (this.filtroAsignacion === 'noAsignados') {
      filtrados = filtrados.filter(m => !this.menusSeleccionados.has(m.codm!));
    }

    this.listaMenusFiltrados = filtrados;
    this.paginaMenuActual = 1;
  }

  get menusPaginados(): Menu[] {
    const inicio = (this.paginaMenuActual - 1) * this.itemsPorPaginaMenu;
    return this.listaMenusFiltrados.slice(inicio, inicio + this.itemsPorPaginaMenu);
  }

  get totalPaginasMenu(): number {
    return Math.ceil(this.listaMenusFiltrados.length / this.itemsPorPaginaMenu) || 1;
  }

  toggleMenu(menu: Menu): void {
    if (!this.rolSeleccionado) return;
    const codm = menu.codm!;
    if (this.menusSeleccionados.has(codm)) {
      this.menusSeleccionados.delete(codm);
    } else {
      this.menusSeleccionados.add(codm);
    }
    if (this.filtroAsignacion !== 'todos') this.aplicarFiltrosMenus();
  }

  guardarAsignacion(): void {
    if (!this.rolSeleccionado) return;
    const ids = Array.from(this.menusSeleccionados);

    this.rolesService.asignarMenus(this.rolSeleccionado.codr!, ids).subscribe({
      next: (msj) => {
        this.mostrarToast(msj || 'Asignación guardada correctamente');
        this.cargarDatos();
      },
      error: () => this.mostrarToast('Error al guardar la asignación', 'error', 3500),
    });
  }

  irPaginaRol(p: number): void { if (p >= 1 && p <= this.totalPaginasRol) this.paginaRolActual = p; }
  paginaAnteriorRol(): void { this.irPaginaRol(this.paginaRolActual - 1); }
  paginaSiguienteRol(): void { this.irPaginaRol(this.paginaRolActual + 1); }
  get paginasRol(): number[] { return Array.from({ length: this.totalPaginasRol }, (_, i) => i + 1); }

  irPaginaMenu(p: number): void { if (p >= 1 && p <= this.totalPaginasMenu) this.paginaMenuActual = p; }
  paginaAnteriorMenu(): void { this.irPaginaMenu(this.paginaMenuActual - 1); }
  paginaSiguienteMenu(): void { this.irPaginaMenu(this.paginaMenuActual + 1); }
  get paginasMenu(): number[] { return Array.from({ length: this.totalPaginasMenu }, (_, i) => i + 1); }

  private mostrarToast(mensaje: string, tipo: 'ok' | 'error' = 'ok', duracion = 2500): void {
    this.toastMensaje = mensaje;
    this.toastTipo = tipo;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastVisible = false, duracion);
  }
}