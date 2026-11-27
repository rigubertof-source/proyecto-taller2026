import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Area } from '../../core/model/areasModel';
import { AreasService } from '../../core/services/areas.service';

declare const bootstrap: any;

@Component({
  selector: 'app-gestion-areas',
  imports: [ReactiveFormsModule],
  templateUrl: './gestion-areas.html',
  styleUrl: './gestion-areas.css',
})
export class GestionAreas implements OnInit, OnDestroy {
  private readonly areasService = inject(AreasService);

  protected listaAreas: Area[] = [];
  protected buscarControl = new FormControl('', { nonNullable: true });

  @ViewChild('addModal') addModal!: ElementRef;
  @ViewChild('modModal') modModal!: ElementRef;
  @ViewChild('confModal') confModal!: ElementRef;

  regFormAgregar = new FormGroup({
    coda: new FormControl<number | null>(null),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    estado: new FormControl(1, [Validators.required]),
  });

  regFormModificar = new FormGroup({
    coda: new FormControl<number | null>(null, [Validators.required]),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    estado: new FormControl(1, [Validators.required]),
  });

  protected paginaActual = 1;
  protected itemsPorPagina = 7;

  protected areaPendiente: Area | null = null;
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
    this.cargarAreas();
  }

  private cargarAreas(): void {
    this.peticion?.unsubscribe();

    if (this.filtroActual === 'nombre') {
      if (!this.terminoBusqueda.trim()) {
        this.filtroActual = 'todos';
        this.cargarAreas();
        return;
      }
      this.peticion = this.areasService.buscarPorNombre(this.terminoBusqueda).subscribe({
        next: data => this.actualizarLista(data),
      });
    } else if (this.filtroActual === 'estado') {
      this.peticion = this.areasService.buscarPorEstado(this.estadoFiltro).subscribe({
        next: data => this.actualizarLista(data),
      });
    } else {
      this.peticion = this.areasService.getAreas().subscribe({
        next: data => this.actualizarLista(data),
      });
    }
  }

  private actualizarLista(data: Area[]): void {
    this.listaAreas = data;
    this.paginaActual = 1;
  }

  onBuscarInput(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      const termino = valor.trim();
      if (termino) {
        this.filtroActual = 'nombre';
        this.terminoBusqueda = termino;
      } else {
        this.filtroActual = 'todos';
        this.terminoBusqueda = '';
      }
      this.cargarAreas();
    }, 300);
  }

  listarPorEstado(estado: number): void {
    this.filtroActual = 'estado';
    this.estadoFiltro = estado;
    this.cargarAreas();
  }

  limpiarAgregar(): void {
    this.regFormAgregar.reset({ coda: null, nombre: '', estado: 1 });
  }

  guardarArea(): void {
    if (this.regFormAgregar.invalid) {
      this.regFormAgregar.markAllAsTouched();
      return;
    }
    this.accionPendiente = 'agregar';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  private ejecutarGuardarArea(): void {
    const valor = this.regFormAgregar.getRawValue();
    const area: Area = {
      coda: valor.coda ?? 0,
      nombre: valor.nombre!.trim(),
      estado: valor.estado ?? 1,
    };

    this.areasService.crearArea(area).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cerrarModal(this.addModal);
        this.limpiarAgregar();
        this.mostrar();
      },
      error: (err) => {
        if (err.status === 409) {
          this.mostrarToast(err.error, 'error', 3500);
        }
      },
    });
  }

  cargarArea(coda: number): void {
    this.areasService.getAreaById(coda).subscribe({
      next: area => {
        this.regFormModificar.patchValue({
          coda: area.coda,
          nombre: area.nombre,
          estado: area.estado,
        });
        bootstrap.Modal.getOrCreateInstance(this.modModal.nativeElement).show();
      },
    });
  }

  guardarModificacion(): void {
    if (this.regFormModificar.invalid) {
      this.regFormModificar.markAllAsTouched();
      return;
    }
    this.accionPendiente = 'modificar';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  private ejecutarGuardarModificacion(): void {
    const valor = this.regFormModificar.getRawValue();
    if (valor.coda === null) return;

    const area: Area = {
      coda: valor.coda,
      nombre: valor.nombre!.trim(),
      estado: valor.estado ?? 1,
    };

    this.areasService.updateArea(area).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cerrarModal(this.modModal);
        this.cargarAreas();
      },
      error: (err) => {
        if (err.status === 409) {
          this.mostrarToast(err.error, 'error', 3500);
        }
      },
    });
  }

  prepararCambioEstado(area: Area, estado: number): void {
    if (area.estado === estado) return;
    this.areaPendiente = area;
    this.estadoPendiente = estado;
    this.accionPendiente = 'estado';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  confirmarAccion(): void {
    const accion = this.accionPendiente;
    this.accionPendiente = null;

    switch (accion) {
      case 'agregar':
        this.ejecutarGuardarArea();
        break;
      case 'modificar':
        this.ejecutarGuardarModificacion();
        break;
      case 'estado':
        this.ejecutarCambioEstado();
        break;
    }
  }

  private ejecutarCambioEstado(): void {
    const area = this.areaPendiente;
    const estado = this.estadoPendiente;
    if (!area || area.coda == null || estado === null) return;

    const actualizada: Area = { coda: area.coda, nombre: area.nombre, estado };

    this.areasService.updateArea(actualizada).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cancelarCambioEstado();
        this.cargarAreas();
      },
    });
  }

  cancelarCambioEstado(): void {
    this.areaPendiente = null;
    this.estadoPendiente = null;
    this.accionPendiente = null;
  }

  cerrarModal(modal: ElementRef | HTMLDivElement): void {
    const elemento = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getInstance(elemento)?.hide();
  }

  get listaPaginada(): Area[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaAreas.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaAreas.length / this.itemsPorPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  irPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas) this.paginaActual = p;
  }

  paginaAnterior(): void {
    this.irPagina(this.paginaActual - 1);
  }

  paginaSiguiente(): void {
    this.irPagina(this.paginaActual + 1);
  }

  private mostrarToast(mensaje: string, tipo: 'ok' | 'error' = 'ok', duracion = 2500): void {
    this.toastMensaje = mensaje;
    this.toastTipo = tipo;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
    }, duracion);
  }
}