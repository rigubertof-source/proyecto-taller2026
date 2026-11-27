import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { TextosService } from '../../core/services/textos.service';
import { AreasService } from '../../core/services/areas.service';
import { EditorialesService } from '../../core/services/editoriales.service';
import { TiposService } from '../../core/services/tipos.service';
import { Texto } from '../../core/model/textosModel';
import { EjemplaresService } from '../../core/services/ejemplares-service';
import { Ejemplar } from '../../core/model/ejemplarModel';
import { AuthService } from '../auth/auth.service';
declare const bootstrap: any;

@Component({
  selector: 'app-gestion-ejemplares',
  imports: [ReactiveFormsModule],
  templateUrl: './gestion-ejemplares.html',
  styleUrl: './gestion-ejemplares.css',
})
export class GestionEjemplares implements OnInit, OnDestroy {
  private readonly textosService = inject(TextosService);
  private readonly areasService = inject(AreasService);
  private readonly editorialesService = inject(EditorialesService);
  private readonly tiposService = inject(TiposService);
  private readonly ejemplaresService = inject(EjemplaresService);
  private readonly authService = inject(AuthService);
  @ViewChild('addModal') addModal!: ElementRef;
  @ViewChild('modModal') modModal!: ElementRef;
  @ViewChild('confModal') confModal!: ElementRef;

  // ---- Combos y filtros (tabla de textos) ----
  listaAreas: any[] = [];
  listaEditoriales: any[] = [];
  listaTipos: any[] = [];

  buscarControl = new FormControl('', { nonNullable: true });
  editorialControl = new FormControl<number | null>(null);
  areaControl = new FormControl<number | null>(null);
  tipoControl = new FormControl<number | null>(null);

  listaTextos: Texto[] = [];
  paginaTexto = 1;
  itemsTexto = 3;
  codtActivos = new Set<number>();
  estadoTexto: 'activos' | 'bajas' | 'todos' = 'todos';

  textoSeleccionado: Texto | null = null;
  listaEjemplares: Ejemplar[] = [];
  filtroEstado: 'activos' | 'bajas' = 'activos';
  paginaEj = 1;
  itemsEj = 10;

  nroInvControl = new FormControl<number | null>(null, [Validators.required, Validators.min(1)]);

  accionPendiente: 'agregar' | 'modificar' | 'baja' | 'alta' | null = null;
  ejemplarPendiente: Ejemplar | null = null;   
  ejemplarEditando: Ejemplar | null = null;    

  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'ok' | 'error' = 'ok';
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private peticion?: Subscription;

  ngOnInit(): void {
    this.areasService.getAreas().subscribe(d => this.listaAreas = d);
    this.editorialesService.getEditoriales().subscribe(d => this.listaEditoriales = d);
    this.tiposService.getTipos().subscribe(d => this.listaTipos = d);
    this.cargarTextos();
    this.cargarCodtActivos();
  }

  ngOnDestroy(): void {
    clearTimeout(this.toastTimer);
    this.peticion?.unsubscribe();
  }

  private loginActual(): string {
    return this.authService.getCurrentSession()?.username ?? '';
  }
  private cargarCodtActivos(): void {
    this.ejemplaresService.getTextosActivos().subscribe(ids => this.codtActivos = new Set(ids));
  }

  esActivo(texto: Texto): boolean {
    return this.codtActivos.has(texto.codt!);
  }

  cambiarEstadoTexto(e: 'activos' | 'bajas' | 'todos'): void {
    this.estadoTexto = e;
    this.paginaTexto = 1;
  }

  get textosFiltrados(): Texto[] {
    if (this.estadoTexto === 'todos') return this.listaTextos;
    const queActivos = this.estadoTexto === 'activos';
    return this.listaTextos.filter(t => this.esActivo(t) === queActivos);
  }
  cargarTextos(): void {
    this.peticion?.unsubscribe();

    const titulo = this.buscarControl.value.trim().toLowerCase();
    const editorial = this.editorialControl.value;
    const area = this.areaControl.value;
    const tipo = this.tipoControl.value;

    const origen$ = tipo ? this.textosService.buscarPorTipo(tipo) : this.textosService.getTextos();

    this.peticion = origen$.subscribe(data => {
      let filtrados = data;
      if (titulo) filtrados = filtrados.filter(t => t.titulo.toLowerCase().includes(titulo));
      if (editorial) filtrados = filtrados.filter(t => t.editorial?.code === editorial);
      if (area) filtrados = filtrados.filter(t => t.area?.coda === area);
      this.listaTextos = filtrados;
      this.paginaTexto = 1;
    });
  }

  onBuscarEnter(): void {
    const termino = this.buscarControl.value.trim();
    if (!termino) { this.cargarTextos(); return; }
    this.peticion?.unsubscribe();
    this.peticion = this.textosService.buscarPorTituloOAutor(termino).subscribe(data => {
      this.listaTextos = data;
      this.paginaTexto = 1;
    });
  }

  seleccionarTexto(texto: Texto): void {
    this.textoSeleccionado = texto;
    this.paginaEj = 1;
    this.cargarEjemplares();
  }

  get textosPaginados(): Texto[] {
    const ini = (this.paginaTexto - 1) * this.itemsTexto;
    return this.textosFiltrados.slice(ini, ini + this.itemsTexto);
  }
  get totalPaginasTexto(): number { return Math.ceil(this.textosFiltrados.length / this.itemsTexto) || 1; }
  get paginasTexto(): number[] { return Array.from({ length: this.totalPaginasTexto }, (_, i) => i + 1); }
  irPaginaTexto(p: number): void { if (p >= 1 && p <= this.totalPaginasTexto) this.paginaTexto = p; }

  cargarEjemplares(): void {
  if (!this.textoSeleccionado) return;
  this.ejemplaresService.getPorTexto(this.textoSeleccionado.codt!).subscribe(data => {
    this.listaEjemplares = data;
    if (this.paginaEj > this.totalPaginasEj) this.paginaEj = this.totalPaginasEj;
    this.cargarCodtActivos();
  });
}

  cambiarFiltroEstado(f: 'activos' | 'bajas'): void {
    this.filtroEstado = f;
    this.paginaEj = 1;
  }

  get ejemplaresFiltrados(): Ejemplar[] {
    const estado = this.filtroEstado === 'activos' ? 1 : 0;
    return this.listaEjemplares.filter(e => e.estado === estado);
  }
  get ejemplaresPaginados(): Ejemplar[] {
    const ini = (this.paginaEj - 1) * this.itemsEj;
    return this.ejemplaresFiltrados.slice(ini, ini + this.itemsEj);
  }
  get totalPaginasEj(): number { return Math.ceil(this.ejemplaresFiltrados.length / this.itemsEj) || 1; }
  get paginasEj(): number[] { return Array.from({ length: this.totalPaginasEj }, (_, i) => i + 1); }
  irPaginaEj(p: number): void { if (p >= 1 && p <= this.totalPaginasEj) this.paginaEj = p; }

  private mostrarModal(modal: ElementRef | HTMLElement): void {
    const elemento = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getOrCreateInstance(elemento).show();
  }
  cerrarModal(modal: ElementRef | HTMLElement): void {
    const elemento = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getInstance(elemento)?.hide();
  }

  abrirAgregar(): void {
    if (!this.textoSeleccionado) return;
    this.nroInvControl.reset(null);
    this.mostrarModal(this.addModal);
  }

  abrirModificar(ej: Ejemplar): void {
    this.ejemplarEditando = ej;
    this.nroInvControl.reset(null);
    this.mostrarModal(this.modModal);
  }

  guardarAgregar(): void {
    if (this.nroInvControl.invalid) { this.nroInvControl.markAsTouched(); return; }
    this.pedirConfirmacion('agregar');
  }

  guardarModificar(): void {
    if (this.nroInvControl.invalid) { this.nroInvControl.markAsTouched(); return; }
    this.pedirConfirmacion('modificar');
  }

  pedirConfirmacion(accion: 'agregar' | 'modificar' | 'baja' | 'alta', ejemplar: Ejemplar | null = null): void {
    this.accionPendiente = accion;
    this.ejemplarPendiente = ejemplar;
    this.mostrarModal(this.confModal);
  }

  cancelarAccion(): void {
    this.accionPendiente = null;
    this.ejemplarPendiente = null;
  }

  confirmarAccion(): void {
    const accion = this.accionPendiente;
    const ej = this.ejemplarPendiente;
    const nro = this.nroInvControl.value;
    this.cerrarModal(this.confModal);

    let peticion$: Observable<string>;
    if ((accion === 'agregar' || accion === 'baja') && !this.loginActual()) {
      this.mostrarToast('No hay un usuario con sesión iniciada', 'error', 3500);
      return;
    }
    switch (accion) {
      case 'agregar':
        if (!this.textoSeleccionado || nro == null) return;
        peticion$ = this.ejemplaresService.agregar(this.textoSeleccionado.codt!, nro, this.loginActual());
        break;
      case 'modificar':
        if (!this.ejemplarEditando || nro == null) return;
        peticion$ = this.ejemplaresService.cambiarCodinv(this.ejemplarEditando.codinv, nro);
        break;
      case 'baja':
        if (!ej) return;
        peticion$ = this.ejemplaresService.darBaja(ej.codinv, this.loginActual());
        break;
      case 'alta':
        if (!ej) return;
        peticion$ = this.ejemplaresService.darAlta(ej.codinv);
        break;
      default: return;
    }

    peticion$.subscribe({
      next: msj => {
        this.mostrarToast(msj);
        if (accion === 'agregar') this.cerrarModal(this.addModal);
        if (accion === 'modificar') { this.cerrarModal(this.modModal); this.ejemplarEditando = null; }
        this.cargarEjemplares();
      },
      error: err => this.mostrarToast(err.error || 'Error al realizar la operación', 'error', 3500),
    });
    this.cancelarAccion();
  }

  private mostrarToast(mensaje: string, tipo: 'ok' | 'error' = 'ok', duracion = 2500): void {
    this.toastMensaje = mensaje;
    this.toastTipo = tipo;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, duracion);
  }
}