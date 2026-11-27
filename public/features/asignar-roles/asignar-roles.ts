import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Roles } from '../../core/model/usuarioModel';
import { UsuarioService } from '../../core/services/usuario.service';
import { RolesService } from '../../core/services/roles.service';

export interface Usuario {
  login: string;
  estado: number;
  persona?: any;
  roles?: Roles[];
}

export interface UsuarioConRoles extends Usuario {
  roles: Roles[];
}

@Component({
  selector: 'app-asignar-roles',
  imports: [CommonModule, FormsModule],
  templateUrl: './asignar-roles.html',
  styleUrl: './asignar-roles.css',
})
export class AsignarRoles implements OnInit {
  private usuariosService = inject(UsuarioService);
  private rolesService = inject(RolesService);

  listaUsuarios: UsuarioConRoles[] = [];
  listaRolesOriginales: Roles[] = [];
  listaRolesFiltrados: Roles[] = [];

  usuarioSeleccionado: UsuarioConRoles | null = null;
  rolesSeleccionados: Set<number> = new Set<number>();

  filtroUsuario = '';
  filtroRol = '';
  filtroAsignacion: 'todos' | 'asignados' | 'noAsignados' = 'todos';

  paginaUsuarioActual = 1;
  itemsPorPaginaUsuario = 5;

  paginaRolActual = 1;
  itemsPorPaginaRol = 5;

  toastVisible = false;
  toastMensaje = '';
  toastTipo: 'ok' | 'error' = 'ok';
  private toastTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.usuariosService.getUsuarios().subscribe(data => {
      this.listaUsuarios = data as UsuarioConRoles[];

      if (this.usuarioSeleccionado) {
        const actualizado = this.listaUsuarios.find(
          u => u.login === this.usuarioSeleccionado!.login
        );
        if (actualizado) this.seleccionarUsuario(actualizado);
      }
    });

    this.rolesService.getRoles().subscribe(data => {
      this.listaRolesOriginales = data as unknown as Roles[];
      this.aplicarFiltrosRoles();
    });
  }

  get usuariosPaginados(): UsuarioConRoles[] {
    const filtrados = this.listaUsuarios.filter(u =>
      (u.login ?? '').toLowerCase().includes(this.filtroUsuario.toLowerCase())
    );
    const inicio = (this.paginaUsuarioActual - 1) * this.itemsPorPaginaUsuario;
    return filtrados.slice(inicio, inicio + this.itemsPorPaginaUsuario);
  }

  get totalPaginasUsuario(): number {
    const filtrados = this.listaUsuarios.filter(u =>
      (u.login ?? '').toLowerCase().includes(this.filtroUsuario.toLowerCase())
    );
    return Math.ceil(filtrados.length / this.itemsPorPaginaUsuario) || 1;
  }

  seleccionarUsuario(usu: UsuarioConRoles): void {
    this.usuarioSeleccionado = usu;
    this.rolesSeleccionados.clear();

    if (usu.roles && usu.roles.length > 0) {
      usu.roles.forEach(r => this.rolesSeleccionados.add(r.codr!));
    }

    this.aplicarFiltrosRoles();
  }

  aplicarFiltrosRoles(): void {
    let filtrados = [...this.listaRolesOriginales];

    if (this.filtroRol.trim()) {
      filtrados = filtrados.filter(r =>
        r.nombre.toLowerCase().includes(this.filtroRol.toLowerCase())
      );
    }

    if (this.filtroAsignacion === 'asignados') {
      filtrados = filtrados.filter(r => this.rolesSeleccionados.has(r.codr!));
    } else if (this.filtroAsignacion === 'noAsignados') {
      filtrados = filtrados.filter(r => !this.rolesSeleccionados.has(r.codr!));
    }

    this.listaRolesFiltrados = filtrados;
    this.paginaRolActual = 1;
  }

  get rolesPaginados(): Roles[] {
    const inicio = (this.paginaRolActual - 1) * this.itemsPorPaginaRol;
    return this.listaRolesFiltrados.slice(inicio, inicio + this.itemsPorPaginaRol);
  }

  get totalPaginasRol(): number {
    return Math.ceil(this.listaRolesFiltrados.length / this.itemsPorPaginaRol) || 1;
  }

  toggleRol(rol: Roles): void {
    if (!this.usuarioSeleccionado) return;

    const codr = rol.codr!;
    if (this.rolesSeleccionados.has(codr)) {
      this.rolesSeleccionados.delete(codr);
    } else {
      this.rolesSeleccionados.add(codr);
    }

    if (this.filtroAsignacion !== 'todos') this.aplicarFiltrosRoles();
  }

  guardarAsignacion(): void {
  if (!this.usuarioSeleccionado) return;

  const ids = Array.from(this.rolesSeleccionados);

  this.usuariosService.asignarRoles(this.usuarioSeleccionado.login, ids).subscribe({
    next: (msj) => {
      this.mostrarToast(msj || 'Asignación guardada correctamente');
      this.cargarDatos();

      this.rolesService.cargarRoles().subscribe();
    },
    error: () => this.mostrarToast('Error al guardar la asignación', 'error', 3500),
  });
}

  irPaginaUsuario(p: number): void { if (p >= 1 && p <= this.totalPaginasUsuario) this.paginaUsuarioActual = p; }
  paginaAnteriorUsuario(): void { this.irPaginaUsuario(this.paginaUsuarioActual - 1); }
  paginaSiguienteUsuario(): void { this.irPaginaUsuario(this.paginaUsuarioActual + 1); }
  get paginasUsuario(): number[] { return Array.from({ length: this.totalPaginasUsuario }, (_, i) => i + 1); }

  irPaginaRol(p: number): void { if (p >= 1 && p <= this.totalPaginasRol) this.paginaRolActual = p; }
  paginaAnteriorRol(): void { this.irPaginaRol(this.paginaRolActual - 1); }
  paginaSiguienteRol(): void { this.irPaginaRol(this.paginaRolActual + 1); }
  get paginasRol(): number[] { return Array.from({ length: this.totalPaginasRol }, (_, i) => i + 1); }

  private mostrarToast(mensaje: string, tipo: 'ok' | 'error' = 'ok', duracion = 2500): void {
    this.toastMensaje = mensaje;
    this.toastTipo = tipo;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, duracion);
  }
}