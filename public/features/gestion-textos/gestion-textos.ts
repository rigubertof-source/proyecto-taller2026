import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TextosService } from '../../core/services/textos.service';
import { AreasService } from '../../core/services/areas.service';
import { EditorialesService } from '../../core/services/editoriales.service';
import { TiposService } from '../../core/services/tipos.service';
import { AutoresService } from '../../core/services/autores.service';
import { Texto } from '../../core/model/textosModel';
import { Subscription } from 'rxjs';
declare const bootstrap: any;

@Component({
  selector: 'app-gestion-textos',
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './gestion-textos.html',
  styleUrl: './gestion-textos.css',
})
export class GestionTextos implements OnInit, OnDestroy {
  private readonly textosService = inject(TextosService);
  private readonly areasService = inject(AreasService);
  private readonly editorialesService = inject(EditorialesService);
  private readonly tiposService = inject(TiposService);
  private readonly autoresService = inject(AutoresService);

  listaTextos: Texto[] = [];
  listaAreas: any[] = [];
  listaEditoriales: any[] = [];
  listaTipos: any[] = [];
  listaAutores: any[] = [];

  buscarControl = new FormControl('', { nonNullable: true });
  editorialControl = new FormControl<number | null>(null);
  areaControl = new FormControl<number | null>(null);
  tipoControl = new FormControl<number | null>(null);

  @ViewChild('addModal') addModal!: ElementRef;
  @ViewChild('modModal') modModal!: ElementRef;
  @ViewChild('confModal') confModal!: ElementRef;
  @ViewChild('verModal') verModal!: ElementRef;
  @ViewChild('fichaTexto') fichaTexto!: ElementRef;

  regFormAgregar = new FormGroup({
    codt: new FormControl<number | null>(null),
    titulo: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    resumen: new FormControl(''),
    isbn: new FormControl('', [Validators.maxLength(20)]),
    edicion: new FormControl<number | null>(null),
    fechapub: new FormControl(''),
    coda: new FormControl<number | null>(null, [Validators.required]),
    code: new FormControl<number | null>(null, [Validators.required])
  });

  regFormModificar = new FormGroup({
    codt: new FormControl<number | null>(null, [Validators.required]),
    titulo: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    resumen: new FormControl(''),
    isbn: new FormControl('', [Validators.maxLength(20)]),
    edicion: new FormControl<number | null>(null),
    fechapub: new FormControl(''),
    coda: new FormControl<number | null>(null, [Validators.required]),
    code: new FormControl<number | null>(null, [Validators.required])
  });

  tiposAgregar: number[] = [];
  autoresAgregar: any[] = [];
  tiposModificar: number[] = [];
  autoresModificar: any[] = [];
  autorSeleccionado: number | null = null;

  paginaActual = 1;
  itemsPorPagina = 5;

  // Estado: A = activos, B = bajas, T = todos
  estadoFiltro: 'A' | 'B' | 'T' = 'T';

  textoPendiente: Texto | null = null;
  accionPendiente: 'agregar' | 'modificar' | 'baja' | 'habilitar' | null = null;
  textoVer: Texto | null = null;

  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'ok' | 'error' = 'ok';

  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private peticion?: Subscription;

  ngOnInit(): void {
    this.cargarCombos();
    this.mostrar();
  }

  ngOnDestroy(): void {
    clearTimeout(this.toastTimer);
    this.peticion?.unsubscribe();
  }

  private cargarCombos(): void {
    this.areasService.getAreas().subscribe(data => this.listaAreas = data);
    this.editorialesService.getEditoriales().subscribe(data => this.listaEditoriales = data);
    this.tiposService.getTipos().subscribe(data => this.listaTipos = data);
    this.autoresService.getAutores().subscribe(data => this.listaAutores = data);
  }

  mostrar(): void {
    this.buscarControl.setValue('', { emitEvent: false });
    this.editorialControl.setValue(null, { emitEvent: false });
    this.areaControl.setValue(null, { emitEvent: false });
    this.tipoControl.setValue(null, { emitEvent: false });
    this.cargarTextos();
  }

  cambiarEstado(e: 'A' | 'B' | 'T'): void {
    this.estadoFiltro = e;
    this.cargarTextos();
  }

  private cargarTextos(): void {
    this.peticion?.unsubscribe();

    const titulo = this.buscarControl.value.trim().toLowerCase();
    const editorial = this.editorialControl.value;
    const area = this.areaControl.value;
    const tipo = this.tipoControl.value;

    const origen$ = tipo
      ? this.textosService.buscarPorTipo(tipo)
      : this.textosService.getTextos();

    this.peticion = origen$.subscribe({
      next: data => {
        let filtrados = data;
        if (titulo) {
          filtrados = filtrados.filter(t => t.titulo.toLowerCase().includes(titulo));
        }
        if (editorial) {
          filtrados = filtrados.filter(t => t.editorial?.code === editorial);
        }
        if (area) {
          filtrados = filtrados.filter(t => t.area?.coda === area);
        }
        this.actualizarLista(filtrados);
      }
    });
  }

  private actualizarLista(data: Texto[]): void {
    if (this.estadoFiltro === 'A') data = data.filter(t => t.estado === 1);
    if (this.estadoFiltro === 'B') data = data.filter(t => t.estado === 0);
    this.listaTextos = data;
    this.paginaActual = 1;
  }

  onFiltroChange(): void {
    this.cargarTextos();
  }

  onBuscarEnter(): void {
    const termino = this.buscarControl.value.trim();

    if (termino) {
      this.peticion?.unsubscribe();
      this.peticion = this.textosService.buscarPorTituloOAutor(termino).subscribe({
        next: data => this.actualizarLista(data)
      });
    } else {
      this.mostrar();
    }
  }


  toggleTipo(lista: number[], codtipo: number, checked: boolean): void {
    const i = lista.indexOf(codtipo);
    if (checked && i < 0) lista.push(codtipo);
    if (!checked && i >= 0) lista.splice(i, 1);
  }

  tieneTipo(lista: number[], codtipo: number): boolean {
    return lista.includes(codtipo);
  }

  agregarAutor(lista: any[]): void {
    if (this.autorSeleccionado == null) return;
    const aut = this.listaAutores.find(a => a.coda === this.autorSeleccionado);
    if (aut && !lista.some(a => a.coda === aut.coda)) lista.push(aut);
    this.autorSeleccionado = null;
  }

  quitarAutor(lista: any[], coda: number): void {
    const i = lista.findIndex(a => a.coda === coda);
    if (i >= 0) lista.splice(i, 1);
  }

  // ---------- Agregar ----------

  limpiarAgregar(): void {
    this.regFormAgregar.reset({
      codt: null, titulo: '', resumen: '', isbn: '', edicion: null, fechapub: '', coda: null, code: null
    });
    this.tiposAgregar = [];
    this.autoresAgregar = [];
    this.autorSeleccionado = null;
  }

  guardarTexto(): void {
    if (this.regFormAgregar.invalid) {
      this.regFormAgregar.markAllAsTouched();
      return;
    }
    this.accionPendiente = 'agregar';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  private ejecutarGuardarTexto(): void {
    const valor = this.regFormAgregar.getRawValue();
    const nuevoTexto: Texto = {
      codt: valor.codt ?? 0,
      titulo: valor.titulo!.trim(),
      resumen: valor.resumen,
      isbn: valor.isbn,
      edicion: valor.edicion ?? undefined,
      fechapub: valor.fechapub || undefined,
      area: { coda: valor.coda!, nombre: '' },
      editorial: { code: valor.code!, nombre: '' },
      tipos: this.tiposAgregar.map(codtipo => ({ codtipo, nombre: '' })),
      autores: this.autoresAgregar.map(a => ({ coda: a.coda, nombre: a.nombre }))
    };

    this.textosService.crearTexto(nuevoTexto).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cerrarModal(this.addModal);
        this.limpiarAgregar();
        this.mostrar();
      },
      error: err => {
        this.mostrarToast(err.error || 'Error al guardar', 'error', 3500);
      },
    });
  }


  cargarTexto(codt: number): void {
    this.textosService.getTextoById(codt).subscribe({
      next: texto => {
        this.regFormModificar.patchValue({
          codt: texto.codt,
          titulo: texto.titulo,
          resumen: texto.resumen || '',
          isbn: texto.isbn || '',
          edicion: texto.edicion || null,
          fechapub: texto.fechapub || '',
          coda: texto.area?.coda || null,
          code: texto.editorial?.code || null
        });
        this.tiposModificar = (texto.tipos ?? []).map(t => t.codtipo);
        this.autoresModificar = [...(texto.autores ?? [])];
        this.autorSeleccionado = null;
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
    if (valor.codt === null) return;

    const textoMod: Texto = {
      codt: valor.codt,
      titulo: valor.titulo!.trim(),
      resumen: valor.resumen,
      isbn: valor.isbn,
      edicion: valor.edicion ?? undefined,
      fechapub: valor.fechapub || undefined,
      area: { coda: valor.coda!, nombre: '' },
      editorial: { code: valor.code!, nombre: '' },
      tipos: this.tiposModificar.map(codtipo => ({ codtipo, nombre: '' })),
      autores: this.autoresModificar.map(a => ({ coda: a.coda, nombre: a.nombre }))
    };

    this.textosService.updateTexto(textoMod).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cerrarModal(this.modModal);
        this.cargarTextos();
      },
      error: err => {
        this.mostrarToast(err.error || 'Error al modificar', 'error', 3500);
      },
    });
  }


  prepararBaja(texto: Texto): void {
    this.textoPendiente = texto;
    this.accionPendiente = 'baja';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  prepararHabilitar(texto: Texto): void {
    this.textoPendiente = texto;
    this.accionPendiente = 'habilitar';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  confirmarAccion(): void {
    const accion = this.accionPendiente;
    this.cerrarModal(this.confModal);

    switch (accion) {
      case 'agregar': this.ejecutarGuardarTexto(); break;
      case 'modificar': this.ejecutarGuardarModificacion(); break;
      case 'baja': this.ejecutarCambioEstado(true); break;
      case 'habilitar': this.ejecutarCambioEstado(false); break;
    }
    this.accionPendiente = null;
  }

  private ejecutarCambioEstado(baja: boolean): void {
    if (!this.textoPendiente) return;
    const codt = this.textoPendiente.codt;
    const req$ = baja
      ? this.textosService.darBaja(codt)
      : this.textosService.habilitar(codt);

    req$.subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cancelarAccion();
        this.cargarTextos();
      },
      error: err => {
        this.mostrarToast(err.error || 'Error al cambiar el estado', 'error', 3500);
      },
    });
  }

  cancelarAccion(): void {
    this.textoPendiente = null;
    this.accionPendiente = null;
  }


  verTexto(texto: Texto): void {
    this.textoVer = texto;
    bootstrap.Modal.getOrCreateInstance(this.verModal.nativeElement).show();
  }

  imprimirFicha(): void {
    const contenido = this.fichaTexto.nativeElement.innerHTML;
    const w = window.open('', '_blank', 'width=800,height=600');
    if (!w) return;
    w.document.write(`<html><head><title>Ficha de Texto</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; }
        h3 { border-bottom: 1px solid #000; padding-bottom: 6px; }
        td { padding: 4px 12px 4px 0; vertical-align: top; }
      </style></head><body>${contenido}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }

  cerrarModal(modal: ElementRef | HTMLDivElement): void {
    const elemento = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getInstance(elemento)?.hide();
  }

  get listaPaginada(): Texto[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaTextos.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaTextos.length / this.itemsPorPagina);
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