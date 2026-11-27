// src/app/features/gestion-roles/gestion-roles.ts
import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Rol } from '../../core/model/rolesModel';
import { RolesService } from '../../core/services/roles.service';

declare const bootstrap: any;

@Component({
  selector: 'app-gestion-roles',
  imports: [ReactiveFormsModule],
  templateUrl: './gestion-roles.html',
  styleUrl: './gestion-roles.css',
})
export class GestionRoles implements OnInit, OnDestroy {
  private readonly rolesService = inject(RolesService);

  protected listaRoles: Rol[] = [];
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

  protected rolPendiente: Rol | null = null;
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
    this.cargarRoles();
  }

  private cargarRoles(): void {
    this.peticion?.unsubscribe();

    if (this.filtroActual === 'nombre') {
      if (!this.terminoBusqueda.trim()) {
        this.filtroActual = 'todos';
        this.cargarRoles();
        return;
      }
      this.peticion = this.rolesService
        .buscarPorNombre(this.terminoBusqueda)
        .subscribe({ next: data => this.actualizarLista(data) });
    } else if (this.filtroActual === 'estado') {
      this.peticion = this.rolesService
        .buscarPorEstado(this.estadoFiltro)
        .subscribe({ next: data => this.actualizarLista(data) });
    } else {
      this.peticion = this.rolesService
        .getRoles()
        .subscribe({ next: data => this.actualizarLista(data) });
    }
  }

  private actualizarLista(data: Rol[]): void {
    this.listaRoles = data;
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
      this.cargarRoles();
    }, 300);
  }

  listarPorEstado(estado: number): void {
    this.filtroActual = 'estado';
    this.estadoFiltro = estado;
    this.cargarRoles();
  }

  limpiarAgregar(): void {
    this.regFormAgregar.reset({ code: null, nombre: '', estado: 1 });
  }

  guardarRol(): void {
    if (this.regFormAgregar.invalid) {
      this.regFormAgregar.markAllAsTouched();
      return;
    }
    this.accionPendiente = 'agregar';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  private ejecutarGuardarRol(): void {
    const valor = this.regFormAgregar.getRawValue();
    const rol: Rol = {
      code: valor.code ?? 0,
      nombre: valor.nombre!.trim(),
      estado: valor.estado ?? 1,
    };

    this.rolesService.crearRol(rol).subscribe({
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

  cargarRol(code: number): void {
    this.rolesService.getRolById(code).subscribe({
      next: rol => {
        this.regFormModificar.patchValue({
          code: rol.code,
          nombre: rol.nombre,
          estado: rol.estado,
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

    const rol: Rol = {
      code: valor.code,
      nombre: valor.nombre!.trim(),
      estado: valor.estado ?? 1,
    };

    this.rolesService.updateRol(rol).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cerrarModal(this.modModal);
        this.cargarRoles();
      },
      error: err => {
        if (err.status === 409) {
          this.mostrarToast(err.error, 'error', 3500);
        }
      },
    });
  }

  prepararCambioEstado(rol: Rol, estado: number): void {
    if (rol.estado === estado) return;

    this.rolPendiente = rol;
    this.estadoPendiente = estado;
    this.accionPendiente = 'estado';
    bootstrap.Modal.getOrCreateInstance(this.confModal.nativeElement).show();
  }

  confirmarAccion(): void {
    const accion = this.accionPendiente;
    this.accionPendiente = null;

    switch (accion) {
      case 'agregar':
        this.ejecutarGuardarRol();
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
    const rol = this.rolPendiente;
    const estado = this.estadoPendiente;

    if (!rol || rol.code == null || estado === null) return;

    const actualizado: Rol = {
      code: rol.code,
      nombre: rol.nombre,
      estado,
    };

    this.rolesService.updateRol(actualizado).subscribe({
      next: mensaje => {
        this.mostrarToast(mensaje);
        this.cancelarCambioEstado();
        this.cargarRoles();
      },
    });
  }

  cancelarCambioEstado(): void {
    this.rolPendiente = null;
    this.estadoPendiente = null;
    this.accionPendiente = null;
  }

  cerrarModal(modal: ElementRef | HTMLDivElement): void {
    const elemento = modal instanceof ElementRef ? modal.nativeElement : modal;
    bootstrap.Modal.getInstance(elemento)?.hide();
  }

  get listaPaginada(): Rol[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaRoles.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaRoles.length / this.itemsPorPagina);
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