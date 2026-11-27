import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Proceso } from '../../core/model/procesoModel';
import { MenuService } from '../../core/services/menu.service';
import { ProcesosService } from '../../core/services/procesos-service';
import { Menu } from '../../core/model/menusModel';
export interface MenuConProcesos extends Menu {
  procesos: Proceso[];
}
@Component({
  selector: 'app-asignar-procesos',
  imports: [CommonModule, FormsModule],
  templateUrl: './asignar-procesos.html',
  styleUrl: './asignar-procesos.css',
})
export class AsignarProcesos implements OnInit{
 private menusService = inject(MenuService);
  private procesosService = inject(ProcesosService);

  listaMenus: MenuConProcesos[] = [];
  listaProcesosOriginales: Proceso[] = [];
  listaProcesosFiltrados: Proceso[] = [];

  menuSeleccionado: MenuConProcesos | null = null;
  procesosSeleccionados: Set<number> = new Set<number>();

  filtroMenu: string = '';
  filtroProceso: string = '';
  filtroAsignacion: 'todos' | 'asignados' | 'noAsignados' = 'todos';

  paginaMenuActual = 1;
  itemsPorPaginaMenu = 5;

  paginaProcesoActual = 1;
  itemsPorPaginaProceso = 5;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.menusService.getMenus().subscribe(data => {
      this.listaMenus = data as MenuConProcesos[];
    });

    this.procesosService.getProcesos().subscribe(data => {
      this.listaProcesosOriginales = data;
      this.aplicarFiltrosProcesos();
    });
  }

  get menusPaginados(): MenuConProcesos[] {
    const filtrados = this.listaMenus.filter(m => 
      m.nombre.toLowerCase().includes(this.filtroMenu.toLowerCase())
    );
    const inicio = (this.paginaMenuActual - 1) * this.itemsPorPaginaMenu;
    return filtrados.slice(inicio, inicio + this.itemsPorPaginaMenu);
  }

  get totalPaginasMenu(): number {
    const filtrados = this.listaMenus.filter(m => 
      m.nombre.toLowerCase().includes(this.filtroMenu.toLowerCase())
    );
    return Math.ceil(filtrados.length / this.itemsPorPaginaMenu) || 1;
  }

  seleccionarMenu(menu: MenuConProcesos): void {
    this.menuSeleccionado = menu;
    
    this.procesosSeleccionados.clear();
    
    if (menu.procesos && menu.procesos.length > 0) {
      menu.procesos.forEach(p => this.procesosSeleccionados.add(p.codp!));
    }

    this.aplicarFiltrosProcesos();
  }

  aplicarFiltrosProcesos(): void {
    let filtrados = [...this.listaProcesosOriginales];

    if (this.filtroProceso.trim()) {
      filtrados = filtrados.filter(p => 
        p.nombre.toLowerCase().includes(this.filtroProceso.toLowerCase())
      );
    }

    if (this.filtroAsignacion === 'asignados') {
      filtrados = filtrados.filter(p => this.procesosSeleccionados.has(p.codp!));
    } else if (this.filtroAsignacion === 'noAsignados') {
      filtrados = filtrados.filter(p => !this.procesosSeleccionados.has(p.codp!));
    }

    this.listaProcesosFiltrados = filtrados;
    this.paginaProcesoActual = 1;
  }

  get procesosPaginados(): Proceso[] {
    const inicio = (this.paginaProcesoActual - 1) * this.itemsPorPaginaProceso;
    return this.listaProcesosFiltrados.slice(inicio, inicio + this.itemsPorPaginaProceso);
  }

  get totalPaginasProceso(): number {
    return Math.ceil(this.listaProcesosFiltrados.length / this.itemsPorPaginaProceso) || 1;
  }

  toggleProceso(proceso: Proceso): void {
    if (!this.menuSeleccionado) return;

    const codp = proceso.codp!;
    if (this.procesosSeleccionados.has(codp)) {
      this.procesosSeleccionados.delete(codp);
    } else {
      this.procesosSeleccionados.add(codp);
    }
    if (this.filtroAsignacion !== 'todos') {
      this.aplicarFiltrosProcesos();
    }
  }

 guardarAsignacion(): void {
  if (!this.menuSeleccionado) return;
  const ids = Array.from(this.procesosSeleccionados);

  this.menusService.asignarProcesos(this.menuSeleccionado.codm!, ids).subscribe({
    next: (msj) => {
      this.mostrarToast(msj, 'ok');
      this.menusService.notificarCambio();   
      this.cargarDatos();
    },
    error: (err) => {
      console.error(err);
      this.mostrarToast('Error al guardar la asignación', 'error', 3500);
    }
  });
}

  irPaginaMenu(p: number): void { if (p >= 1 && p <= this.totalPaginasMenu) this.paginaMenuActual = p; }
  paginaAnteriorMenu(): void { this.irPaginaMenu(this.paginaMenuActual - 1); }
  paginaSiguienteMenu(): void { this.irPaginaMenu(this.paginaMenuActual + 1); }
  get paginasMenu(): number[] { return Array.from({ length: this.totalPaginasMenu }, (_, i) => i + 1); }

  irPaginaProceso(p: number): void { if (p >= 1 && p <= this.totalPaginasProceso) this.paginaProcesoActual = p; }
  paginaAnteriorProceso(): void { this.irPaginaProceso(this.paginaProcesoActual - 1); }
  paginaSiguienteProceso(): void { this.irPaginaProceso(this.paginaProcesoActual + 1); }
  get paginasProceso(): number[] { return Array.from({ length: this.totalPaginasProceso }, (_, i) => i + 1); }

  toastVisible = false;
toastMensaje = '';
toastTipo: 'ok' | 'error' = 'ok';
private toastTimer?: ReturnType<typeof setTimeout>;

private mostrarToast(mensaje: string, tipo: 'ok' | 'error' = 'ok', duracion = 2500): void {
  this.toastMensaje = mensaje;
  this.toastTipo = tipo;
  this.toastVisible = true;
  clearTimeout(this.toastTimer);
  this.toastTimer = setTimeout(() => { this.toastVisible = false; }, duracion);
}
}
