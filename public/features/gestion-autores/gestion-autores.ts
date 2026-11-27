import { Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Autor } from '../../core/model/autoresModel';
import { AutoresService } from '../../core/services/autores.service';
import { ImpresionService } from '../../shared/services/impresion-service';
import { fichaAutor } from '../../core/utils/fichaAutor';

declare const bootstrap: any;

@Component({
  selector: 'app-gestion-autores',
  imports: [ReactiveFormsModule],
  templateUrl: './gestion-autores.html',
  styleUrl: './gestion-autores.css',
})
export class GestionAutores implements OnInit, OnDestroy {
  private readonly autoresService = inject(AutoresService);
  private readonly impresion = inject(ImpresionService);

  protected listaAutores: Autor[] = [];
  protected buscarControl = new FormControl('', { nonNullable: true });

  @ViewChild('addModal') addModal!: ElementRef;
  @ViewChild('modModal') modModal!: ElementRef;
  @ViewChild('confModal') confModal!: ElementRef;
  @ViewChild('impModal') impModalElement!: ElementRef;

  protected autorImp = signal<Autor | null>(null);

  regFormAgregar = new FormGroup({
    coda: new FormControl<number | null>(null),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    ap: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    am: new FormControl('', [Validators.maxLength(100)]),
    genero: new FormControl('', [Validators.required]),
    estado: new FormControl(1, [Validators.required]),
  });

  regFormModificar = new FormGroup({
    coda: new FormControl<number | null>(null, [Validators.required]),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    ap: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    am: new FormControl('', [Validators.maxLength(100)]),
    genero: new FormControl('', [Validators.required]),
    estado: new FormControl(1, [Validators.required]),
  });

  protected paginaActual = 1;
  protected itemsPorPagina = 5;

  protected autorPendiente: Autor | null = null;
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
    this.cargarAutores();
  }

  private cargarAutores(): void {
    this.peticion?.unsubscribe();

    if (this.filtroActual === 'nombre') {
      if (!this.terminoBusqueda.trim()) {
        this.filtroActual = 'todos';
        this.cargarAutores();
        return;
      }
      this.peticion = this.autoresService
        .buscarPorNombre(this.terminoBusqueda)
        .subscribe({ next: data => this.actualizarLista(data) });
    } else if (this.filtroActual === 'estado') {
      this.peticion = this.autoresService
        .buscarPorEstado(this.estadoFiltro)
        .subscribe({ next: data => this.actualizarLista(data) });
    } else {
      this.peticion = this.autoresService
        .getAutores()
        .subscribe({ next: data => this.actualizarLista(data) });
    }
  }

  private actualizarLista(data: Autor[]): void {
    this.listaAutores = data;
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
      this.cargarAutores();
    }, 300);
  }

  listarPorEstado(estado: number): void {
    this.filtroActual = 'estado';
    this.estadoFiltro = estado;
    this.cargarAutores();
  }

  limpiarAgregar(): void {
    this.regFormAgregar.reset({
      coda: null, nombre: '', ap: '', am: '', genero: '', estado: 1,
    });
  }

  guardarAutor(): void {
    if (this.regFormAgregar.invalid) {
      this.regFormAgregar.markAllAsTouched();
      return;
    }
    this.accionPendiente = 'agregar';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  private ejecutarGuardarAutor(): void {
    const valor = this.regFormAgregar.getRawValue();
    const autor: Autor = {
      coda: valor.coda ?? 0,
      nombre: valor.nombre!.trim(),
      ap: valor.ap!.trim(),
      am: valor.am?.trim() ?? '',
      genero: valor.genero!,
      estado: valor.estado ?? 1,
    };

    this.autoresService.crearAutor(autor).subscribe({
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

  cargarAutor(coda: number): void {
    this.autoresService.getAutorById(coda).subscribe({
      next: autor => {
        this.regFormModificar.patchValue({
          coda: autor.coda,
          nombre: autor.nombre,
          ap: autor.ap,
          am: autor.am,
          genero: autor.genero,
          estado: autor.estado,
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

    const autor: Autor = {
      coda: valor.coda,
      nombre: valor.nombre!.trim(),
      ap: valor.ap!.trim(),
      am: valor.am?.trim() ?? '',
      genero: valor.genero!,
      estado: valor.estado ?? 1,
    };

    this.autoresService.updateAutor(autor).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cerrarModal(this.modModal);
        this.cargarAutores();
      },
      error: err => {
        if (err.status === 409) {
          this.mostrarToast(err.error, 'error', 3500);
        }
      },
    });
  }

  prepararCambioEstado(autor: Autor, estado: number): void {
    if (autor.estado === estado) return;
    this.autorPendiente = autor;
    this.estadoPendiente = estado;
    this.accionPendiente = 'estado';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  private ejecutarCambioEstado(): void {
    const autor = this.autorPendiente;
    const estado = this.estadoPendiente;
    if (!autor || autor.coda == null || estado === null) return;

    const actualizado: Autor = { ...autor, estado };

    this.autoresService.updateAutor(actualizado).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cancelarCambioEstado();
        this.cargarAutores();
      },
    });
  }

  confirmarAccion(): void {
    const accion = this.accionPendiente;
    this.accionPendiente = null;

    switch (accion) {
      case 'agregar': this.ejecutarGuardarAutor(); break;
      case 'modificar': this.ejecutarGuardarModificacion(); break;
      case 'estado': this.ejecutarCambioEstado(); break;
    }
  }

  cancelarCambioEstado(): void {
    this.autorPendiente = null;
    this.estadoPendiente = null;
    this.accionPendiente = null;
  }

  cerrarModal(modal: ElementRef | HTMLDivElement): void {
    const elemento = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getInstance(elemento)?.hide();
  }

  get listaPaginada(): Autor[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaAutores.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaAutores.length / this.itemsPorPagina);
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

  abrirFicha(autor: Autor): void {
    if (autor.coda === undefined) return;
    this.autorImp.set(autor);
    bootstrap.Modal.getOrCreateInstance(this.impModalElement.nativeElement).show();

    this.autoresService.getAutorById(autor.coda).subscribe({
      next: a => this.autorImp.set(a),
    });
  }

  protected imprimirFicha(): void {
    const a = this.autorImp();
    if (!a) return;
    this.impresion.imprimirHtml(fichaAutor(a));
  }
}