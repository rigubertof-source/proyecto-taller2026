import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TextosService } from '../../core/services/textos.service';
import { AreasService } from '../../core/services/areas.service';
import { EditorialesService } from '../../core/services/editoriales.service';
import { TiposService } from '../../core/services/tipos.service';
import { Texto } from '../../core/model/textosModel';
import { EjemplaresService } from '../../core/services/ejemplares-service';

@Component({
  selector: 'app-busqueda-ejemplares',
  imports: [ReactiveFormsModule],
  templateUrl: './busqueda-ejemplares.html',
  styleUrl: './busqueda-ejemplares.css',
})
export class BusquedaEjemplares implements OnInit, OnDestroy {
  private readonly textosService = inject(TextosService);
  private readonly areasService = inject(AreasService);
  private readonly editorialesService = inject(EditorialesService);
  private readonly tiposService = inject(TiposService);
  private readonly ejemplaresService = inject(EjemplaresService);
  private readonly sanitizer = inject(DomSanitizer);

  private todos: Texto[] = [];
  listaResultados: Texto[] = [];
  listaAreas: any[] = [];
  listaEditoriales: any[] = [];
  listaTipos: any[] = [];

  tituloControl = new FormControl('', { nonNullable: true });
  autorControl = new FormControl('', { nonNullable: true });
  areaControl = new FormControl<number | null>(null);
  editorialControl = new FormControl<number | null>(null);
  tipoControl = new FormControl<number | null>(null);

  paginaActual = 1;
  itemsPorPagina = 5;

  textoVer: Texto | null = null;
  pdfUrl: SafeResourceUrl | null = null;
  cargandoPdf = false;
  errorPdf = '';
  private pdfObjectUrl: string | null = null;
  hayFiltros = false;

  ngOnInit(): void {
    this.areasService.getAreas().subscribe(data => this.listaAreas = data);
    this.editorialesService.getEditoriales().subscribe(data => this.listaEditoriales = data);
    this.tiposService.getTipos().subscribe(data => this.listaTipos = data);
    this.textosService.getTextos().subscribe(data => {
      this.todos = data.filter(t => t.estado === 1);
      this.filtrar();
    });
  }

  ngOnDestroy(): void {
    this.liberarPdf();
  }


  private norm(s: string | null | undefined): string {
    return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

 filtrar(): void {
  const titulo = this.norm(this.tituloControl.value);
  const autor = this.norm(this.autorControl.value);
  const area = this.areaControl.value;
  const editorial = this.editorialControl.value;
  const tipo = this.tipoControl.value;

  this.hayFiltros = !!(titulo || autor || area || editorial || tipo);
  this.paginaActual = 1;

  if (!this.hayFiltros) {
    this.listaResultados = [];
    return;
  }

  this.listaResultados = this.todos.filter(t =>
    (!titulo || this.norm(t.titulo).includes(titulo)) &&
    (!autor || (t.autores ?? []).some(a =>
      this.norm(`${a.nombre} ${a.ap ?? ''} ${a.am ?? ''}`).includes(autor))) &&
    (!area || t.area?.coda === area) &&
    (!editorial || t.editorial?.code === editorial) &&
    (!tipo || (t.tipos ?? []).some(x => x.codtipo === tipo))
  );
}

  limpiar(): void {
    this.tituloControl.setValue('');
    this.autorControl.setValue('');
    this.areaControl.setValue(null);
    this.editorialControl.setValue(null);
    this.tipoControl.setValue(null);
    this.filtrar();
  }

  autoresTexto(t: Texto): string {
    const lista = (t.autores ?? []).map(a => `${a.nombre} ${a.ap ?? ''} ${a.am ?? ''}`.trim());
    return lista.length ? lista.join(', ') : '-';
  }

  tiposTexto(t: Texto): string {
    const lista = (t.tipos ?? []).map(x => x.nombre);
    return lista.length ? lista.join(', ') : '-';
  }


  verEjemplar(texto: Texto): void {
    this.liberarPdf();
    this.textoVer = texto;
    this.errorPdf = '';
    this.cargandoPdf = true;

    this.ejemplaresService.getPdf(texto.codt).subscribe({
      next: blob => {
        this.pdfObjectUrl = URL.createObjectURL(blob);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfObjectUrl);
        this.cargandoPdf = false;
      },
      error: err => {
        this.errorPdf = err.status === 404
          ? 'Este ejemplar no tiene un archivo digital disponible.'
          : 'No se pudo cargar el ejemplar.';
        this.cargandoPdf = false;
      },
    });
  }

  volver(): void {
    this.liberarPdf();
    this.textoVer = null;
  }

  private liberarPdf(): void {
    if (this.pdfObjectUrl) URL.revokeObjectURL(this.pdfObjectUrl);
    this.pdfObjectUrl = null;
    this.pdfUrl = null;
  }


  get listaPaginada(): Texto[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaResultados.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaResultados.length / this.itemsPorPagina);
  }

  get paginas(): number[] {
    const total = this.totalPaginas;
    const ini = Math.max(1, Math.min(this.paginaActual - 2, total - 4));
    const fin = Math.min(total, ini + 4);
    return Array.from({ length: fin - ini + 1 }, (_, i) => ini + i);
  }

  irPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas) this.paginaActual = p;
  }

  paginaAnterior(): void { this.irPagina(this.paginaActual - 1); }
  paginaSiguiente(): void { this.irPagina(this.paginaActual + 1); }
}