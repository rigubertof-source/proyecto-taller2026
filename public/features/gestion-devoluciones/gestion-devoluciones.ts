import { DatePipe } from '@angular/common';
import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DevolPrestamo } from '../../core/model/devolucionModel';
import { DetallePrestamo } from '../../core/model/prestamoModel';
import { AuthService } from '../auth/auth.service';
import { DevolucionesService } from '../../core/services/devoluciones-service';
import { PrestamosService } from '../../core/services/prestamo-service';
declare const bootstrap: any;

@Component({
  selector: 'app-gestion-devoluciones',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './gestion-devoluciones.html',
  styleUrl: './gestion-devoluciones.css',
})
export class GestionDevoluciones implements OnInit, OnDestroy {
  private readonly devolService = inject(DevolucionesService);
  private readonly prestamosService = inject(PrestamosService);
  private readonly authService = inject(AuthService);
  @ViewChild('confModal') confModal!: ElementRef;

  fechaIniControl = new FormControl('', { nonNullable: true });
  fechaFinControl = new FormControl('', { nonNullable: true });
  buscarControl = new FormControl('', { nonNullable: true });
  nroControl = new FormControl('', { nonNullable: true });
  estadoFiltro: 'prestados' | 'devueltos' = 'prestados';

  listaPrestamos: DevolPrestamo[] = [];
  paginaP = 1;
  itemsP = 15;
  prestamoSeleccionado: DevolPrestamo | null = null;

  listaDetalle: DetallePrestamo[] = [];
  seleccionados = new Set<number>();           

  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'ok' | 'error' = 'ok';
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void { this.cargarPrestamos(); }
  ngOnDestroy(): void { clearTimeout(this.toastTimer); }

  private loginActual(): string {
    return this.authService.getCurrentSession()?.username ?? '';
  }

  cargarPrestamos(): void {
    this.devolService.getPrestamos().subscribe(data => {
      this.listaPrestamos = data;
      if (this.paginaP > this.totalPaginasP) this.paginaP = this.totalPaginasP;
      if (this.prestamoSeleccionado) {
        this.prestamoSeleccionado =
          data.find(p => p.codp === this.prestamoSeleccionado!.codp) ?? null;
      }
      this.cargarDetalle();
    });
  }

  nombreCompleto(p: { ap: string; am: string | null; nombre: string }): string {
    return [p.ap, p.am, p.nombre].filter(Boolean).join(' ');
  }
  private normalizar(s: string): string {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  cambiarEstadoFiltro(e: 'prestados' | 'devueltos'): void {
    this.estadoFiltro = e;
    this.paginaP = 1;
  }

  get prestamosFiltrados(): DevolPrestamo[] {
    const ini = this.fechaIniControl.value;
    const fin = this.fechaFinControl.value;
    const q = this.normalizar(this.buscarControl.value);
    const nro = this.nroControl.value.trim();
    const n = nro ? Number(nro) : null;
    const queDevueltos = this.estadoFiltro === 'devueltos';
    return this.listaPrestamos.filter(p =>
      p.pendiente === !queDevueltos &&
      (!ini || p.fecha >= ini) &&
      (!fin || p.fecha <= fin) &&
      (!q || this.normalizar(this.nombreCompleto(p)).includes(q)) &&
      (n === null || p.codp === n || p.codinvs.includes(n)));
  }
  get prestamosPaginados(): DevolPrestamo[] {
    const ini = (this.paginaP - 1) * this.itemsP;
    return this.prestamosFiltrados.slice(ini, ini + this.itemsP);
  }
  get totalPaginasP(): number { return Math.ceil(this.prestamosFiltrados.length / this.itemsP) || 1; }
  get paginasP(): number[] { return Array.from({ length: this.totalPaginasP }, (_, i) => i + 1); }
  irPaginaP(p: number): void { if (p >= 1 && p <= this.totalPaginasP) this.paginaP = p; }

  seleccionarPrestamo(p: DevolPrestamo): void {
    this.prestamoSeleccionado = p;
    this.seleccionados.clear();
    this.cargarDetalle();
  }

  // ================= DETALLE =================
  cargarDetalle(): void {
    if (!this.prestamoSeleccionado) { this.listaDetalle = []; this.seleccionados.clear(); return; }
    this.prestamosService.getDetalle(this.prestamoSeleccionado.codp).subscribe(d => {
      this.listaDetalle = d;
      this.seleccionados.clear();
    });
  }

  estaDevuelto(d: DetallePrestamo): boolean { return d.estado === 0; }

  marcado(d: DetallePrestamo): boolean {
    return this.estaDevuelto(d) || this.seleccionados.has(d.codinv);
  }
  alternar(d: DetallePrestamo, checked: boolean): void {
    if (this.estaDevuelto(d)) return;
    if (checked) this.seleccionados.add(d.codinv);
    else this.seleccionados.delete(d.codinv);
  }

  pedirConfirmacion(): void {
    if (!this.prestamoSeleccionado || this.seleccionados.size === 0) {
      this.mostrarToast('Marque al menos un ejemplar a devolver', 'error', 3000);
      return;
    }
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  confirmarGuardar(): void {
    bootstrap.Modal.getInstance(this.confModal.nativeElement)?.hide();
    const p = this.prestamoSeleccionado;
    const login = this.loginActual();
    if (!p) return;
    if (!login) { this.mostrarToast('No hay un usuario con sesión iniciada', 'error', 3500); return; }

    this.devolService.guardar({ codp: p.codp, codinvs: [...this.seleccionados], login }).subscribe({
      next: msj => { this.mostrarToast(msj); this.cargarPrestamos(); },
      error: err => this.mostrarToast(err.error || 'Error al realizar la operación', 'error', 3500),
    });
  }

  private mostrarToast(mensaje: string, tipo: 'ok' | 'error' = 'ok', duracion = 2500): void {
    this.toastMensaje = mensaje;
    this.toastTipo = tipo;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, duracion);
  }
}