import { DatePipe } from '@angular/common';
import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DetallePrestamo, EjemplarDisp, Estudiante, Prestamo } from '../../core/model/prestamoModel';
import { AuthService } from '../auth/auth.service';
import { PrestamosService } from '../../core/services/prestamo-service';
declare const bootstrap: any;

@Component({
  selector: 'app-gestion-prestamos',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './gestion-prestamos.html',
  styleUrl: './gestion-prestamos.css',
})
export class GestionPrestamos implements OnInit, OnDestroy {
  private readonly prestamosService = inject(PrestamosService);
  private readonly authService = inject(AuthService);
  @ViewChild('addModal') addModal!: ElementRef;
  @ViewChild('confModal') confModal!: ElementRef;

  fechaIniControl = new FormControl('', { nonNullable: true });
  fechaFinControl = new FormControl('', { nonNullable: true });
  buscarControl = new FormControl('', { nonNullable: true });
  estadoFiltro: 'activos' | 'bajas' | 'todos' = 'todos';

  listaPrestamos: Prestamo[] = [];
  paginaP = 1;
  itemsP = 15;                                  
  prestamoSeleccionado: Prestamo | null = null;
  listaDetalle: DetallePrestamo[] = [];        

  listaEstudiantes: Estudiante[] = [];
  listaEjDisp: EjemplarDisp[] = [];
  form = new FormGroup({
    fecha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fini: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    ffin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipopres: new FormControl<number | null>(null, [Validators.required]),
    ci: new FormControl<number | null>(null, [Validators.required]),
    ejemplares: new FormArray<FormControl<number | null>>([]),
  });

  accionPendiente: 'agregar' | 'eliminar' | null = null;
  prestamoPendiente: Prestamo | null = null;
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
    this.prestamosService.getPrestamos().subscribe(data => {
      this.listaPrestamos = data;
      if (this.paginaP > this.totalPaginasP) this.paginaP = this.totalPaginasP;
      if (this.prestamoSeleccionado) {
        this.prestamoSeleccionado =
          data.find(p => p.codp === this.prestamoSeleccionado!.codp) ?? null;
        this.cargarDetalle();
      }
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
    this.paginaP = 1;
  }

  get prestamosFiltrados(): Prestamo[] {
    const ini = this.fechaIniControl.value;
    const fin = this.fechaFinControl.value;
    const q = this.normalizar(this.buscarControl.value);
    return this.listaPrestamos.filter(p =>
      (this.estadoFiltro === 'todos' || p.estado === (this.estadoFiltro === 'activos' ? 1 : 0)) &&
      (!ini || p.fecha >= ini) &&
      (!fin || p.fecha <= fin) &&
      (!q || this.normalizar(this.nombreCompleto(p)).includes(q)));
  }
  get prestamosPaginados(): Prestamo[] {
    const ini = (this.paginaP - 1) * this.itemsP;
    return this.prestamosFiltrados.slice(ini, ini + this.itemsP);
  }
  get totalPaginasP(): number { return Math.ceil(this.prestamosFiltrados.length / this.itemsP) || 1; }
  get paginasP(): number[] { return Array.from({ length: this.totalPaginasP }, (_, i) => i + 1); }
  irPaginaP(p: number): void { if (p >= 1 && p <= this.totalPaginasP) this.paginaP = p; }

  seleccionarPrestamo(p: Prestamo): void {
    this.prestamoSeleccionado = p;
    this.cargarDetalle();
  }
  cargarDetalle(): void {
    if (!this.prestamoSeleccionado) { this.listaDetalle = []; return; }
    this.prestamosService.getDetalle(this.prestamoSeleccionado.codp)
      .subscribe(d => this.listaDetalle = d);
  }

  get filas(): FormArray<FormControl<number | null>> { return this.form.controls.ejemplares; }

  agregarFila(): void { this.filas.push(new FormControl<number | null>(null, [Validators.required])); }
  quitarFila(i: number): void { this.filas.removeAt(i); }

  opcionesFila(i: number): EjemplarDisp[] {
    const usados = this.filas.controls.filter((_, k) => k !== i).map(c => c.value);
    return this.listaEjDisp.filter(e => !usados.includes(e.codinv));
  }
  codinvFila(i: number): number | null { return this.filas.at(i).value; }

  abrirNuevo(): void {
    const hoy = new Date().toISOString().substring(0, 10);
    this.form.reset({ fecha: hoy, fini: '', ffin: '', tipopres: null, ci: null });
    this.filas.clear();
    this.agregarFila();
    this.prestamosService.getEstudiantes().subscribe(d => this.listaEstudiantes = d);
    this.prestamosService.getEjemplaresDisponibles().subscribe(d => this.listaEjDisp = d);
    this.mostrarModal(this.addModal);
  }

  guardarNuevo(): void {
    if (this.form.invalid || this.filas.length === 0) {
      this.form.markAllAsTouched();
      this.mostrarToast('Complete todos los campos y seleccione al menos un ejemplar', 'error', 3500);
      return;
    }
    const v = this.form.getRawValue();
    if (v.ffin < v.fini) {
      this.mostrarToast('La fecha fin no puede ser anterior a la fecha inicio', 'error', 3500);
      return;
    }
    this.pedirConfirmacion('agregar');
  }

  private mostrarModal(modal: ElementRef | HTMLElement): void {
    const el = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getOrCreateInstance(el).show();
  }
  cerrarModal(modal: ElementRef | HTMLElement): void {
    const el = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getInstance(el)?.hide();
  }

   pedirConfirmacion(accion: 'agregar' | 'eliminar', p: Prestamo | null = null): void {
    this.accionPendiente = accion;
    this.prestamoPendiente = p;
    this.mostrarModal(this.confModal);
  }
  cancelarAccion(): void { this.accionPendiente = null; this.prestamoPendiente = null; }

  confirmarAccion(): void {
    const accion = this.accionPendiente;
    const p = this.prestamoPendiente;
    this.cerrarModal(this.confModal);
    this.cancelarAccion();

    const login = this.loginActual();
    if (!login) { this.mostrarToast('No hay un usuario con sesión iniciada', 'error', 3500); return; }

    if (accion === 'agregar') {
      const v = this.form.getRawValue();
      this.prestamosService.agregar({
        fecha: v.fecha, fini: v.fini, ffin: v.ffin,
        tipopres: v.tipopres!, ci: v.ci!,
        codinvs: v.ejemplares.map(x => x!), login,
      }).subscribe({
        next: msj => { this.mostrarToast(msj); this.cerrarModal(this.addModal); this.cargarPrestamos(); },
        error: err => this.mostrarToast(err.error || 'Error al realizar la operación', 'error', 3500),
      });
        } else if (accion === 'eliminar' && p) {
      this.prestamosService.eliminar(p.codp).subscribe({
        next: msj => {
          this.mostrarToast(msj);
          if (this.prestamoSeleccionado?.codp === p.codp) {
            this.prestamoSeleccionado = null;
            this.listaDetalle = [];
          }
          this.cargarPrestamos();
        },
        error: err => this.mostrarToast(err.error || 'Error al realizar la operación', 'error', 3500),
      });
    }
  }

  imprimirComprobante(p: Prestamo): void {
    this.prestamosService.getDetalle(p.codp).subscribe(det => {
      const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
      const filas = det.map(d => `<tr><td>${d.codinv}</td><td>${esc(d.titulo)}</td>
        <td>${d.estado === 1 ? 'Prestado' : 'Devuelto'}</td></tr>`).join('');
      const w = window.open('', '_blank', 'width=800,height=600');
      if (!w) { this.mostrarToast('El navegador bloqueó la ventana de impresión', 'error', 3500); return; }
      w.document.write(`<html><head><title>Comprobante de Préstamo ${p.codp}</title>
        <style>body{font-family:Arial;padding:24px} table{border-collapse:collapse;width:100%;margin-top:12px}
        th,td{border:1px solid #999;padding:6px 8px;text-align:left}</style></head><body>
        <h3>Comprobante de Préstamo Nº ${p.codp}</h3>
        <p><b>Estudiante:</b> ${esc(this.nombreCompleto(p))} (CI ${p.ci})</p>
        <p><b>Fecha:</b> ${p.fecha} &nbsp; <b>Desde:</b> ${p.fini} &nbsp; <b>Hasta:</b> ${p.ffin}</p>
        <p><b>Tipo:</b> ${p.tipopres === 1 ? 'En Sala' : 'Domicilio'}</p>
        <table><thead><tr><th>Cod. Inv.</th><th>Título</th><th>Estado</th></tr></thead>
        <tbody>${filas}</tbody></table></body></html>`);
      w.document.close();
      w.focus();
      w.print();
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