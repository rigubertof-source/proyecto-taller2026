import { Component, ElementRef, inject, ViewChild } from '@angular/core';
import { TiposService } from '../../core/services/tipos.service';
import { Tipo } from '../../core/model/tiposModel';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
declare const bootstrap: any;

@Component({
  selector: 'app-gestion-tipos',
  imports: [ReactiveFormsModule],
  templateUrl: './gestion-tipos.html',
  styleUrl: './gestion-tipos.css',
})
export class GestionTipos {
  private readonly tiposService = inject(TiposService);

  listaTipos: Tipo[] = [];
  buscarControl = new FormControl('', { nonNullable: true });

  @ViewChild('addModal') addModal!: ElementRef;
  @ViewChild('modModal') modModal!: ElementRef;
  @ViewChild('confModal') confModal!: ElementRef;

  regFormAgregar = new FormGroup({
    codtipo: new FormControl<number | null>(null),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    estado: new FormControl(1, [Validators.required]),
    sw: new FormControl(false)
  });

  regFormModificar = new FormGroup({
    codtipo: new FormControl<number | null>(null, [Validators.required]),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    estado: new FormControl(1, [Validators.required]),
    sw: new FormControl(false)
  });

  paginaActual = 1;
  itemsPorPagina = 5;

  tipoPendiente: Tipo | null = null;
  estadoPendiente: number | null = null;
  accionPendiente: 'agregar' | 'modificar' | 'estado' | null = null;

  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'ok' | 'error' = 'ok';

  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private filtroActual: 'todos' | 'nombre' | 'estado' = 'todos';
  private estadoFiltro = 1;
  private terminoBusqueda = '';
  private peticion?: Subscription;

  ngOnInit(): void {
    this.mostrar();

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
    this.cargarTipos();
  }

  private cargarTipos(): void {
    this.peticion?.unsubscribe();

    if (this.filtroActual === 'nombre') {
      if (!this.terminoBusqueda.trim()) {
        this.filtroActual = 'todos';
        this.cargarTipos();
        return;
      }
      this.peticion = this.tiposService
        .buscarPorNombre(this.terminoBusqueda)
        .subscribe({ next: data => this.actualizarLista(data) });

    } else if (this.filtroActual === 'estado') {
      this.peticion = this.tiposService
        .buscarPorEstado(this.estadoFiltro)
        .subscribe({ next: data => this.actualizarLista(data) });

    } else {
      this.peticion = this.tiposService
        .getTipos()
        .subscribe({ next: data => this.actualizarLista(data) });
    }
  }

  private actualizarLista(data: Tipo[]): void {
    this.listaTipos = data;
    this.paginaActual = 1;
    console.log('Lista de tipos:', this.listaTipos);
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
      this.cargarTipos();
    }, 300);
  }

  listarPorEstado(estado: number): void {
    this.filtroActual = 'estado';
    this.estadoFiltro = estado;
    this.cargarTipos();
  }


  limpiarAgregar(): void {
    this.regFormAgregar.reset({ codtipo: null, nombre: '', estado: 1, sw: false });
  }

  guardarTipo(): void {
    if (this.regFormAgregar.invalid) {
      this.regFormAgregar.markAllAsTouched();
      return;
    }
    this.accionPendiente = 'agregar';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  private ejecutarGuardarTipo(): void {
    const valor = this.regFormAgregar.getRawValue();
    const tipo: Tipo = {
      codtipo: valor.codtipo ?? 0,
      nombre: valor.nombre!.trim(),
      estado: valor.estado ?? 1,
      sw: valor.sw ? 1 : 0
    };

    this.tiposService.crearTipo(tipo).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cerrarModal(this.addModal);
        this.limpiarAgregar();
        this.mostrar();
      },
      error: err => {
        if (err.status === 409) {
          this.mostrarToast(err.error, 'error', 3500);
        }
      },
    });
  }

  cargarTipo(codtipo: number): void {
    this.tiposService.getTiposById(codtipo).subscribe({
      next: tipo => {
        this.regFormModificar.patchValue({
          codtipo: tipo.codtipo,
          nombre: tipo.nombre,
          estado: tipo.estado,
          sw: tipo.sw === 1
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
    if (valor.codtipo === null) return;

    const tipo: Tipo = {
      codtipo: valor.codtipo,
      nombre: valor.nombre!.trim(),
      estado: valor.estado ?? 1,
      sw: valor.sw ? 1 : 0
    };

    this.tiposService.updateTipo(tipo).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cerrarModal(this.modModal);
        this.cargarTipos();
      },
      error: err => {
        if (err.status === 409) {
          this.mostrarToast(err.error, 'error', 3500);
        }
      },
    });
  }

  prepararCambioEstado(tipo: Tipo, estado: number): void {
  if (tipo.estado === estado) return;
  this.tipoPendiente = tipo;
  this.estadoPendiente = estado;
  this.accionPendiente = 'estado';  
  bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
}

  confirmarAccion(): void {
  const accion = this.accionPendiente;
  this.cerrarModal(this.confModal);

  switch (accion) {
    case 'agregar':
      this.ejecutarGuardarTipo();
      break;
    case 'modificar':
      this.ejecutarGuardarModificacion();
      break;
    case 'estado':
      this.ejecutarCambioEstado();
      break;
  }
  this.accionPendiente = null;
}

private ejecutarCambioEstado(): void {
  const tipo = this.tipoPendiente;
  const estado = this.estadoPendiente;
  if (!tipo || tipo.codtipo == null || estado === null) return;

  const actualizado: Tipo = {
    codtipo: tipo.codtipo,
    nombre: tipo.nombre,
    estado,
    sw: tipo.sw
  };

  this.tiposService.updateTipo(actualizado).subscribe({
    next: mensaje => {
      this.mostrarToast(mensaje);
      this.cancelarCambioEstado();
      this.cargarTipos();
    },
  });
}

  cancelarCambioEstado(): void {
  this.tipoPendiente = null;
  this.estadoPendiente = null;
  this.accionPendiente = null;
}

  cerrarModal(modal: ElementRef | HTMLDivElement): void {
    const elemento = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getInstance(elemento)?.hide();
  }

  get listaPaginada(): Tipo[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaTipos.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaTipos.length / this.itemsPorPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  irPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas) this.paginaActual = p;
  }

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