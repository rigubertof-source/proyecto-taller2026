import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Proceso } from '../../core/model/procesoModel';
import { ProcesosService } from '../../core/services/procesos-service';
import { MenuService } from '../../core/services/menu.service';

declare const bootstrap: any;

@Component({
  selector: 'app-gestion-procesos',
  imports: [ReactiveFormsModule],
  templateUrl: './gestion-procesos.html',
  styleUrl: './gestion-procesos.css',
})
export class GestionProcesos implements OnInit, OnDestroy {
  private readonly procesosService = inject(ProcesosService);
  private readonly menuService = inject(MenuService);
  protected listaProcesos: Proceso[] = [];
  protected buscarControl = new FormControl('', { nonNullable: true });

  @ViewChild('addModal') addModal!: ElementRef;
  @ViewChild('modModal') modModal!: ElementRef;
  @ViewChild('confModal') confModal!: ElementRef;

  regFormAgregar = new FormGroup({
    codp: new FormControl<number | null>(null),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    enlace: new FormControl('', [Validators.maxLength(200)]), // Campo enlace
    estado: new FormControl(1, [Validators.required]),
  });

  regFormModificar = new FormGroup({
    codp: new FormControl<number | null>(null, [Validators.required]),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    enlace: new FormControl('', [Validators.maxLength(200)]), // Campo enlace
    estado: new FormControl(1, [Validators.required]),
  });

  protected paginaActual = 1;
  protected itemsPorPagina = 5;
  protected procesoPendiente: Proceso | null = null;
  protected estadoPendiente: number | null = null;
  protected accionPendiente: 'agregar' | 'modificar' | 'estado' | null = null;
  protected toastVisible = false;
  protected toastMensaje = '';
  protected toastTipo: 'ok' | 'error' = 'ok';

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private filtroActual: 'todos' | 'nombre' | 'estado' = 'todos';
  private estadoFiltro = 1;
  private terminoBusqueda = '';
  private peticion?: Subscription;

  ngOnInit(): void {
    this.mostrar();
    document.addEventListener('hide.bs.modal', () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
    clearTimeout(this.toastTimer);
    this.peticion?.unsubscribe();
  }

  mostrar(): void {
    this.filtroActual = 'todos';
    this.terminoBusqueda = '';
    this.buscarControl.setValue('', { emitEvent: false });
    this.cargarProcesos();
  }

  private cargarProcesos(): void {
    this.peticion?.unsubscribe();
    if (this.filtroActual === 'nombre') {
      if (!this.terminoBusqueda.trim()) { this.filtroActual = 'todos'; this.cargarProcesos(); return; }
      this.peticion = this.procesosService.buscarPorNombre(this.terminoBusqueda).subscribe({ next: data => this.actualizarLista(data) });
    } else if (this.filtroActual === 'estado') {
      this.peticion = this.procesosService.buscarPorEstado(this.estadoFiltro).subscribe({ next: data => this.actualizarLista(data) });
    } else {
      this.peticion = this.procesosService.getProcesos().subscribe({ next: data => this.actualizarLista(data) });
    }
  }

  private actualizarLista(data: Proceso[]): void {
    this.listaProcesos = data;
    this.paginaActual = 1;
  }

  onBuscarInput(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const termino = valor.trim();
      this.filtroActual = termino ? 'nombre' : 'todos';
      this.terminoBusqueda = termino;
      this.cargarProcesos();
    }, 300);
  }

  listarPorEstado(estado: number): void {
    this.filtroActual = 'estado';
    this.estadoFiltro = estado;
    this.cargarProcesos();
  }

  limpiarAgregar(): void {
    this.regFormAgregar.reset({ codp: null, nombre: '', enlace: '', estado: 1 });
  }

  guardarProceso(): void {
    if (this.regFormAgregar.invalid) { this.regFormAgregar.markAllAsTouched(); return; }
    this.accionPendiente = 'agregar';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  private ejecutarGuardarProceso(): void {
    const valor = this.regFormAgregar.getRawValue();
    const proceso: Proceso = {
      nombre: valor.nombre!.trim(),
      enlace: valor.enlace?.trim() ?? '',
      estado: valor.estado ?? 1,
    };

    this.procesosService.crearProceso(proceso).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.menuService.notificarCambio();
        this.cerrarModal(this.addModal);
        this.limpiarAgregar();
        this.mostrar();
      },
      error: err => {
        if (err.status === 409) this.mostrarToast(err.error, 'error', 3500);
      },
    });
  }

  cargarProceso(codp: number): void {
    this.procesosService.getProcesoById(codp).subscribe({
      next: proceso => {
        this.regFormModificar.patchValue({
          codp: proceso.codp ?? codp,
          nombre: proceso.nombre,
          enlace: proceso.enlace,
          estado: proceso.estado,
        });
        bootstrap.Modal.getOrCreateInstance(this.modModal.nativeElement).show();
      },
    });
  }

  guardarModificacion(): void {
    if (this.regFormModificar.invalid) { this.regFormModificar.markAllAsTouched(); return; }
    this.accionPendiente = 'modificar';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  private ejecutarGuardarModificacion(): void {
    const valor = this.regFormModificar.getRawValue();
    if (valor.codp === null) return;

    const proceso: Proceso = {
      codp: valor.codp,
      nombre: valor.nombre!.trim(),
      enlace: valor.enlace?.trim() ?? '',
      estado: valor.estado ?? 1,
    };

    this.procesosService.updateProceso(proceso).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.menuService.notificarCambio();
        this.cerrarModal(this.modModal);
        this.cargarProcesos();
      },
      error: err => {
        if (err.status === 409) this.mostrarToast(err.error, 'error', 3500);
      },
    });
  }

  prepararCambioEstado(proceso: Proceso, estado: number): void {
    if (proceso.estado === estado) return;
    this.procesoPendiente = proceso;
    this.estadoPendiente = estado;
    this.accionPendiente = 'estado';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  confirmarAccion(): void {
    const accion = this.accionPendiente;
    this.accionPendiente = null;
    switch (accion) {
      case 'agregar': this.ejecutarGuardarProceso(); break;
      case 'modificar': this.ejecutarGuardarModificacion(); break;
      case 'estado': this.ejecutarCambioEstado(); break;
    }
  }

  private ejecutarCambioEstado(): void {
    const proceso = this.procesoPendiente;
    const estado = this.estadoPendiente;
    if (!proceso || proceso.codp == null || estado === null) return;

    const actualizado: Proceso = {
      codp: proceso.codp,
      nombre: proceso.nombre,
      enlace: proceso.enlace,
      estado,
    };

    this.procesosService.updateProceso(actualizado).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.menuService.notificarCambio();
        this.cancelarCambioEstado();
        this.cargarProcesos();
      },
    });
  }

  cancelarCambioEstado(): void {
    this.procesoPendiente = null;
    this.estadoPendiente = null;
    this.accionPendiente = null;
  }

  cerrarModal(modal: ElementRef | HTMLDivElement): void {
    const elemento = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getInstance(elemento)?.hide();
  }

  get listaPaginada(): Proceso[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaProcesos.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number { return Math.ceil(this.listaProcesos.length / this.itemsPorPagina); }
  get paginas(): number[] { return Array.from({ length: this.totalPaginas }, (_, i) => i + 1); }
  irPagina(p: number): void { if (p >= 1 && p <= this.totalPaginas) this.paginaActual = p; }
  paginaAnterior(): void { this.irPagina(this.paginaActual - 1); }
  paginaSiguiente(): void { this.irPagina(this.paginaActual + 1); }

  private mostrarToast(mensaje: string, tipo: 'ok' | 'error' = 'ok', duracion = 2500): void {
    this.toastMensaje = mensaje;
    this.toastTipo = tipo;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, duracion);
  }
}