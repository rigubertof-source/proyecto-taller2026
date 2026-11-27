import { DatePipe } from '@angular/common';
import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DetalleDevol, DevolucionLista } from '../../core/model/devolucionModel';
import { DevolucionesService } from '../../core/services/devoluciones-service';
declare const bootstrap: any;

@Component({
  selector: 'app-anular-devoluciones',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './anular-devoluciones.html',
  styleUrl: './anular-devoluciones.css',
})
export class AnularDevoluciones implements OnInit, OnDestroy {
  private readonly devolService = inject(DevolucionesService);
  @ViewChild('confModal') confModal!: ElementRef;

  fechaIniControl = new FormControl('', { nonNullable: true });
  fechaFinControl = new FormControl('', { nonNullable: true });
  buscarControl = new FormControl('', { nonNullable: true });
  estadoFiltro: 'activos' | 'bajas' | 'todos' = 'todos';

  listaDevoluciones: DevolucionLista[] = [];
  paginaD = 1;
  itemsD = 15;
  devolucionSeleccionada: DevolucionLista | null = null;

  listaDetalle: DetalleDevol[] = [];

  devolucionPendiente: DevolucionLista | null = null;

  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'ok' | 'error' = 'ok';
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void { this.cargarDevoluciones(); }
  ngOnDestroy(): void { clearTimeout(this.toastTimer); }

  cargarDevoluciones(): void {
    this.devolService.getDevoluciones().subscribe(data => {
      this.listaDevoluciones = data;
      if (this.paginaD > this.totalPaginasD) this.paginaD = this.totalPaginasD;
      if (this.devolucionSeleccionada) {
        this.devolucionSeleccionada =
          data.find(d => d.codd === this.devolucionSeleccionada!.codd) ?? null;
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

  cambiarEstadoFiltro(e: 'activos' | 'bajas' | 'todos'): void {
    this.estadoFiltro = e;
    this.paginaD = 1;
  }

  get devolucionesFiltradas(): DevolucionLista[] {
    const ini = this.fechaIniControl.value;
    const fin = this.fechaFinControl.value;
    const q = this.normalizar(this.buscarControl.value);
    return this.listaDevoluciones.filter(d =>
      (this.estadoFiltro === 'todos' || d.estado === (this.estadoFiltro === 'activos' ? 1 : 0)) &&
      (!ini || d.fecha >= ini) &&
      (!fin || d.fecha <= fin) &&
      (!q || this.normalizar(this.nombreCompleto(d)).includes(q)));
  }
  get devolucionesPaginadas(): DevolucionLista[] {
    const ini = (this.paginaD - 1) * this.itemsD;
    return this.devolucionesFiltradas.slice(ini, ini + this.itemsD);
  }
  get totalPaginasD(): number { return Math.ceil(this.devolucionesFiltradas.length / this.itemsD) || 1; }
  get paginasD(): number[] { return Array.from({ length: this.totalPaginasD }, (_, i) => i + 1); }
  irPaginaD(p: number): void { if (p >= 1 && p <= this.totalPaginasD) this.paginaD = p; }

  seleccionarDevolucion(d: DevolucionLista): void {
    this.devolucionSeleccionada = d;
    this.cargarDetalle();
  }
  cargarDetalle(): void {
    if (!this.devolucionSeleccionada) { this.listaDetalle = []; return; }
    this.devolService.getDetalleDevolucion(this.devolucionSeleccionada.codd)
      .subscribe(d => this.listaDetalle = d);
  }

  pedirConfirmacion(d: DevolucionLista): void {
    this.devolucionPendiente = d;
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }
  cancelarAccion(): void { this.devolucionPendiente = null; }

  confirmarAnular(): void {
    const d = this.devolucionPendiente;
    bootstrap.Modal.getInstance(this.confModal.nativeElement)?.hide();
    this.cancelarAccion();
    if (!d) return;

    this.devolService.anular(d.codd).subscribe({
      next: msj => {
        this.mostrarToast(msj);
        if (this.devolucionSeleccionada?.codd === d.codd) {
          this.devolucionSeleccionada = null;
          this.listaDetalle = [];
        }
        this.cargarDevoluciones();
      },
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