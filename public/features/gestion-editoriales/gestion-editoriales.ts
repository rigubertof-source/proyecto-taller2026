import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Editorial } from '../../core/model/editorialModel';
import { EditorialesService } from '../../core/services/editoriales.service';

declare const bootstrap: any;

@Component({
  selector: 'app-gestion-editoriales',
  imports: [ReactiveFormsModule],
  templateUrl: './gestion-editoriales.html',
  styleUrl: './gestion-editoriales.css',
})
export class GestionEditoriales implements OnInit, OnDestroy {
  private readonly editorialesService = inject(EditorialesService);

  protected listaEditoriales: Editorial[] = [];
  protected buscarControl = new FormControl('', { nonNullable: true });

  @ViewChild('addModal') addModal!: ElementRef;
  @ViewChild('modModal') modModal!: ElementRef;
  @ViewChild('confModal') confModal!: ElementRef;

  regFormAgregar = new FormGroup({
    code: new FormControl<number | null>(null),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    estado: new FormControl(1, [Validators.required]),
  });

  regFormModificar = new FormGroup({
    code: new FormControl<number | null>(null, [Validators.required]),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    estado: new FormControl(1, [Validators.required]),
  });

  protected paginaActual = 1;
  protected itemsPorPagina = 5;

  protected editorialPendiente: Editorial | null = null;
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
    this.cargarEditoriales();
  }

  private cargarEditoriales(): void {
    this.peticion?.unsubscribe();

    if (this.filtroActual === 'nombre') {
      if (!this.terminoBusqueda.trim()) {
        this.filtroActual = 'todos';
        this.cargarEditoriales();
        return;
      }
      this.peticion = this.editorialesService
        .buscarPorNombre(this.terminoBusqueda)
        .subscribe({ next: data => this.actualizarLista(data) });
    } else if (this.filtroActual === 'estado') {
      this.peticion = this.editorialesService
        .buscarPorEstado(this.estadoFiltro)
        .subscribe({ next: data => this.actualizarLista(data) });
    } else {
      this.peticion = this.editorialesService
        .getEditoriales()
        .subscribe({ next: data => this.actualizarLista(data) });
    }
  }

  private actualizarLista(data: Editorial[]): void {
    this.listaEditoriales = data;
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
      this.cargarEditoriales();
    }, 300);
  }

  listarPorEstado(estado: number): void {
    this.filtroActual = 'estado';
    this.estadoFiltro = estado;
    this.cargarEditoriales();
  }

  limpiarAgregar(): void {
    this.regFormAgregar.reset({ code: null, nombre: '', estado: 1 });
  }

  guardarEditorial(): void {
    if (this.regFormAgregar.invalid) {
      this.regFormAgregar.markAllAsTouched();
      return;
    }
    this.accionPendiente = 'agregar';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  private ejecutarGuardarEditorial(): void {
    const valor = this.regFormAgregar.getRawValue();
    const editorial: Editorial = {
      code: valor.code ?? 0,
      nombre: valor.nombre!.trim(),
      estado: valor.estado ?? 1,
    };

    this.editorialesService.crearEditorial(editorial).subscribe({
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

  cargarEditorial(code: number): void {
    this.editorialesService.getEditorialById(code).subscribe({
      next: editorial => {
        this.regFormModificar.patchValue({
          code: editorial.code,
          nombre: editorial.nombre,
          estado: editorial.estado,
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
    if (valor.code === null) return;

    const editorial: Editorial = {
      code: valor.code,
      nombre: valor.nombre!.trim(),
      estado: valor.estado ?? 1,
    };

    this.editorialesService.updateEditorial(editorial).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cerrarModal(this.modModal);
        this.cargarEditoriales();
      },
      error: err => {
        if (err.status === 409) {
          this.mostrarToast(err.error, 'error', 3500);
        }
      },
    });
  }

  prepararCambioEstado(editorial: Editorial, estado: number): void {
    if (editorial.estado === estado) return;

    this.editorialPendiente = editorial;
    this.estadoPendiente = estado;
    this.accionPendiente = 'estado';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  confirmarAccion(): void {
    const accion = this.accionPendiente;
    this.accionPendiente = null;

    switch (accion) {
      case 'agregar':
        this.ejecutarGuardarEditorial();
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
    const editorial = this.editorialPendiente;
    const estado = this.estadoPendiente;

    if (!editorial || editorial.code == null || estado === null) return;

    const actualizada: Editorial = {
      code: editorial.code,
      nombre: editorial.nombre,
      estado,
    };

    this.editorialesService.updateEditorial(actualizada).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cancelarCambioEstado();
        this.cargarEditoriales();
      },
    });
  }

  cancelarCambioEstado(): void {
    this.editorialPendiente = null;
    this.estadoPendiente = null;
    this.accionPendiente = null;
  }

  cerrarModal(modal: ElementRef | HTMLDivElement): void {
    const elemento = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getInstance(elemento)?.hide();
  }

  get listaPaginada(): Editorial[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaEditoriales.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaEditoriales.length / this.itemsPorPagina);
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