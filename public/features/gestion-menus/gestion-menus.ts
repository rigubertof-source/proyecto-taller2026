// src/app/features/gestion-menus/gestion-menus.ts
import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Menu } from '../../core/model/menusModel';
import { MenuService } from '../../core/services/menu.service';

declare const bootstrap: any;

@Component({
  selector: 'app-gestion-menus',
  imports: [ReactiveFormsModule],
  templateUrl: './gestion-menus.html',
  styleUrl: './gestion-menus.css',
})
export class GestionMenus implements OnInit, OnDestroy {
  private readonly menusService = inject(MenuService);

  protected listaMenus: Menu[] = [];
  protected buscarControl = new FormControl('', { nonNullable: true });

  @ViewChild('addModal') addModal!: ElementRef;
  @ViewChild('modModal') modModal!: ElementRef;
  @ViewChild('confModal') confModal!: ElementRef;

  regFormAgregar = new FormGroup({
    codm: new FormControl<number | null>(null),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    estado: new FormControl(1, [Validators.required]),
  });

  regFormModificar = new FormGroup({
    codm: new FormControl<number | null>(null, [Validators.required]),
    nombre: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    estado: new FormControl(1, [Validators.required]),
  });

  protected paginaActual = 1;
  protected itemsPorPagina = 5;

  protected menuPendiente: Menu | null = null;
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
    this.cargarMenus();
  }

  private cargarMenus(): void {
    this.peticion?.unsubscribe();

    if (this.filtroActual === 'nombre') {
      if (!this.terminoBusqueda.trim()) {
        this.filtroActual = 'todos';
        this.cargarMenus();
        return;
      }
      this.peticion = this.menusService
        .buscarPorNombre(this.terminoBusqueda)
        .subscribe({ next: data => this.actualizarLista(data) });
    } else if (this.filtroActual === 'estado') {
      this.peticion = this.menusService
        .buscarPorEstado(this.estadoFiltro)
        .subscribe({ next: data => this.actualizarLista(data) });
    } else {
      this.peticion = this.menusService
        .getMenus()
        .subscribe({ next: data => this.actualizarLista(data) });
    }
  }

  private actualizarLista(data: Menu[]): void {
    this.listaMenus = data;
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
      this.cargarMenus();
    }, 300);
  }

  listarPorEstado(estado: number): void {
    this.filtroActual = 'estado';
    this.estadoFiltro = estado;
    this.cargarMenus();
  }

  limpiarAgregar(): void {
    this.regFormAgregar.reset({ codm: null, nombre: '', estado: 1 });
  }

  guardarMenu(): void {
    if (this.regFormAgregar.invalid) {
      this.regFormAgregar.markAllAsTouched();
      return;
    }
    this.accionPendiente = 'agregar';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  private ejecutarGuardarMenu(): void {
    const valor = this.regFormAgregar.getRawValue();
    const menu: any = {
    nombre: valor.nombre!.trim(),
    estado: valor.estado ?? 1
  };

    this.menusService.crearMenu(menu).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.menusService.notificarCambio();
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

  cargarMenu(codm: number): void {
    this.menusService.getMenuById(codm).subscribe({
      next: menu => {
        this.regFormModificar.patchValue({
          codm: menu.codm,
          nombre: menu.nombre,
          estado: menu.estado,
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
    if (valor.codm === null) return;

    const menu: Menu = {
      codm: valor.codm,
      nombre: valor.nombre!.trim(),
      estado: valor.estado ?? 1,
    };

    this.menusService.updateMenu(menu).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.menusService.notificarCambio();
        this.cerrarModal(this.modModal);
        this.cargarMenus();
      },
      error: err => {
        if (err.status === 409) {
          this.mostrarToast(err.error, 'error', 3500);
        }
      },
    });
  }

  prepararCambioEstado(menu: Menu, estado: number): void {
    if (menu.estado === estado) return;

    this.menuPendiente = menu;
    this.estadoPendiente = estado;
    this.accionPendiente = 'estado';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  confirmarAccion(): void {
    const accion = this.accionPendiente;
    this.accionPendiente = null;

    switch (accion) {
      case 'agregar':
        this.ejecutarGuardarMenu();
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
    const menu = this.menuPendiente;
    const estado = this.estadoPendiente;

    if (!menu || menu.codm == null || estado === null) return;

    const actualizado: Menu = {
      codm: menu.codm,
      nombre: menu.nombre,
      estado,
    };

    this.menusService.updateMenu(actualizado).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.menusService.notificarCambio();
        this.cancelarCambioEstado();
        this.cargarMenus();
      },
    });
  }

  cancelarCambioEstado(): void {
    this.menuPendiente = null;
    this.estadoPendiente = null;
    this.accionPendiente = null;
  }

  cerrarModal(modal: ElementRef | HTMLDivElement): void {
    const elemento = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getInstance(elemento)?.hide();
  }

  get listaPaginada(): Menu[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaMenus.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaMenus.length / this.itemsPorPagina);
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