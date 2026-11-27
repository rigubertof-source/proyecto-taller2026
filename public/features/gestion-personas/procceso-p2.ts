import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Persona } from '../../core/model/personasModel';
import { PersonasService } from '../../core/services/personas.service';
import { UsuarioService } from '../../core/services/usuario.service';
import { of, switchMap } from 'rxjs';
import { urlFoto } from '../../core/utils/urlFoto';
import { fichaPersonaHtml } from '../../core/utils/ficha-persona';
import { ImpresionService } from '../../shared/services/impresion-service';

declare var bootstrap: any;
function coincidenPasswords(group: AbstractControl): ValidationErrors | null {
  const p = group.get('passwd')?.value;
  const r = group.get('repasswd')?.value;
  return p === r ? null : { noCoinciden: true };
}
@Component({
  selector: 'app-procceso-p2',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './procceso-p2.html',
  styleUrl: './procceso-p2.css',
})
export class ProccesoP2 implements OnInit {
  private readonly PersonaService = inject(PersonasService);
  private readonly usuarioService = inject(UsuarioService);
  protected listaPer: Persona[] = [];
  protected buscarControl = new FormControl('', { nonNullable: true });
  private readonly impresion = inject(ImpresionService);
  @ViewChild('modModal') modalElement!: ElementRef;
  @ViewChild('addModal') addModal!: ElementRef;
  @ViewChild('botoncerrar') botonCerrar!: ElementRef;
  @ViewChild('usuModal') usuModalElement!: ElementRef;
  @ViewChild('impModal') impModalElement!: ElementRef;
  @ViewChild('confModal') confModalElement!: ElementRef;
  protected eAdd = signal('');
  protected eMod = signal('');
  protected personaImp = signal<Persona | null>(null);
  regFormAgregar: FormGroup;
  regFormModificar: FormGroup;
  regFormUsuario: FormGroup;
  protected personaUsu = signal<Persona | null>(null);
  protected tieneUsuario = signal(false);
  protected persona = signal<Persona | null>(null);
  protected personaPendiente: Persona | null = null;
  protected estadoPendiente: number | null = null;
  protected accionPendiente: 'agregarPersona' | 'modificarPersona' | 'estado' | 'usuario' | null = null;
  private debounceTimer: any;
  protected readonly urlFoto = urlFoto;


  protected archivoAdd: File | null = null;
  protected previewAdd = '';
  protected archivoMod: File | null = null;
  protected previewMod = '';
  constructor() {
    this.regFormAgregar = new FormGroup({
      ci: new FormControl(''),
      nombre: new FormControl('', [Validators.required]),
      ap: new FormControl('', [Validators.required]),
      am: new FormControl('', [Validators.required]),
      genero: new FormControl('', [Validators.required]),
      estado: new FormControl(1, [Validators.required]),
      tipoper: new FormControl('', [Validators.required]),
      foto: new FormControl(''),
      telefonos: new FormArray<FormControl<string>>([])
    });

    this.regFormModificar = new FormGroup({
      codper: new FormControl(null),
      ci: new FormControl(''),
      nombre: new FormControl(''),
      ap: new FormControl(''),
      am: new FormControl(''),
      genero: new FormControl(''),
      estado: new FormControl(1),
      tipoper: new FormControl(''),
      foto: new FormControl(''),
      telefonos: new FormArray<FormControl<string>>([])
    });
    this.regFormUsuario = new FormGroup({
      login: new FormControl('', Validators.required),
      passwd: new FormControl('', Validators.required),
      repasswd: new FormControl('', Validators.required),
      estado: new FormControl(1),
    }, { validators: coincidenPasswords });
  }

  ngOnInit(): void {
    this.mostrar();
    this.cargarConUsuario();

    document.addEventListener('hide.bs.modal', () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });
  }

  mostrar(): void {
    this.PersonaService.getPersonas().subscribe({
      next: (data) => {
        this.listaPer = data;
      },
    });
  }

  enviarDatos(): void {
    if (this.regFormAgregar.invalid) {
      this.regFormAgregar.markAllAsTouched();
      return;
    }
    this.accionPendiente = 'agregarPersona';
    bootstrap.Modal.getOrCreateInstance(this.confModalElement.nativeElement).show();
  }

  private ejecutarEnviarDatos(): void {
    const dato = this.armarPayload(this.regFormAgregar.value);
    const archivo = this.archivoAdd;
    let mensajeExito = '';

    this.PersonaService.crearPersona(dato).pipe(
      switchMap((res: any) => {
        mensajeExito = res.mensaje;
        return archivo && res.persona.codper != null
          ? this.PersonaService.subirFoto(res.persona.codper, archivo)
          : of(res);
      })
    ).subscribe({
      next: () => {
        this.mostrarToast(mensajeExito);
        this.mostrar();
        this.botonCerrar?.nativeElement.click();   // cierra modal agregar
        this.limpiarAgregar();
      },
      error: (err) => {
        if (err.status === 409) {
          this.mostrarToast(err.error.message);
        }
      },
    });
  }
  protected get telefonosAdd(): FormArray<FormControl<string>> {
    return this.regFormAgregar.get('telefonos') as FormArray<FormControl<string>>;
  }
  protected get telefonosMod(): FormArray<FormControl<string>> {
    return this.regFormModificar.get('telefonos') as FormArray<FormControl<string>>;
  }
alMenosUnApellido(group: AbstractControl): ValidationErrors | null {
  const ap = (group.get('ap')?.value ?? '').trim();
  const am = (group.get('am')?.value ?? '').trim();
  return ap || am ? null : { sinApellido: true };
}
  protected agregarTelefono(arr: FormArray<FormControl<string>>): void {
    arr.push(new FormControl('', { nonNullable: true }));
  }
  protected quitarTelefono(arr: FormArray<FormControl<string>>, i: number): void {
    arr.removeAt(i);
  }
  listarPorEstado(xestado: number): void {
    this.PersonaService.buscarPorEstado(xestado).subscribe({
      next: (personasEncontradas) => {
        this.listaPer = personasEncontradas;
        console.log('Personas por estado:', personasEncontradas);
      },
    });
  }
  listarPorTipo(xtipo: string): void {
    this.PersonaService.buscarPorTipo(xtipo).subscribe({
      next: (personasEncontradas) => {
        this.listaPer = personasEncontradas;
        console.log('Personas por estado:', personasEncontradas);
      },

    });
  }
  buscarPersona(codper: number): void {
    this.PersonaService.getPersonaById(codper).subscribe({
      next: (p) => {
        this.persona.set(p);
        const { datos, telefonos, ...resto } = p;
        this.regFormModificar.patchValue({ ...resto, ci: datos?.ci ?? '' });

        this.telefonosMod.clear();
        telefonos?.forEach(t =>
          this.telefonosMod.push(new FormControl(t.id.numero, { nonNullable: true }))
        );
      },
    });
  }

  buscarPersonaPorNombre(bus: string): void {
    const termino = bus.trim();
    if (!termino) {
      this.mostrar();
      return;
    }

    this.PersonaService.buscarPorNombre(termino).subscribe({
      next: (personasEncontradas: Persona[]) => {
        this.listaPer = personasEncontradas;
        if (personasEncontradas.length === 0) {

        }
      },

    });
  }
  onBuscarInput(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.buscarPersonaPorNombre(valor);
    }, 300);
  }
  cargarPersonal(codper: number): void {
    this.limpiarFotoMod();
    this.buscarPersona(codper);
    if (this.modalElement) {
      const myModal = new bootstrap.Modal(this.modalElement.nativeElement);
      myModal.show();
    }
  }
  guardarModificacion(): void {
    if (this.regFormModificar.invalid) {
      this.regFormModificar.markAllAsTouched();
      return;
    }
    this.accionPendiente = 'modificarPersona';
    bootstrap.Modal.getOrCreateInstance(this.confModalElement.nativeElement).show();
  }

  private ejecutarGuardarModificacion(): void {
    const codper = this.persona()?.codper || this.regFormModificar.get('codper')?.value;
    if (!codper) return;

    const datosActualizados: Persona = {
      ...this.armarPayload(this.regFormModificar.value, codper),
      codper
    };
    const archivo = this.archivoMod;
    let mensajeExito = '';

    this.PersonaService.updatePersona(datosActualizados).pipe(
      switchMap((res: any) => {
        mensajeExito = res.mensaje;
        return archivo ? this.PersonaService.subirFoto(codper, archivo) : of(res);
      })
    ).subscribe({
      next: () => {
        this.mostrarToast(mensajeExito);
        this.mostrar();
        this.cerrarModal();
      },
      error: (err) => {
        if (err.status === 409) {
          this.mostrarToast(err.error.mensaje, 'error', 3500);
        }
      },
    });
  }
  
  cambiarEstado(persona: Persona, estado: number): void {
    if (persona.estado === estado) return;

    const personaActualizar: Persona = { ...persona, estado };

    this.PersonaService.updatePersona(personaActualizar).subscribe({
      next: (res: any) => {
        const actualizada: Persona = res.persona;
        const idx = this.listaPer.findIndex(p => p.codper === actualizada.codper);
        if (idx !== -1) {
          this.listaPer[idx] = { ...this.listaPer[idx], ...actualizada };
        }
        this.mostrarToast(res.mensaje);
      },
      error: (err) => {
        this.mostrarToast(err.error.mensaje, 'error', 3500);
      },
    });
  }
  cerrarModal(): void {
    if (this.modalElement) {
      const modalInstance = bootstrap.Modal.getInstance(this.modalElement.nativeElement);
      modalInstance?.hide();
    }
  }
  abrirUsuario(persona: Persona): void {
    if (persona.codper === undefined) return;
    this.personaUsu.set(persona);

    this.usuarioService.getUsuarioPorPersona(persona.codper).subscribe({
      next: (usuario) => {
        this.tieneUsuario.set(!!usuario);

        if (usuario) {
          this.regFormUsuario.controls['login'].disable();
          this.regFormUsuario.reset({
            login: usuario.login, passwd: '', repasswd: '', estado: usuario.estado
          });
        } else {
          this.regFormUsuario.controls['login'].enable();
          this.regFormUsuario.reset({ login: '', passwd: '', repasswd: '', estado: 1 });
        }

        bootstrap.Modal.getOrCreateInstance(this.usuModalElement.nativeElement).show();
      },
    });
  }
  protected conUsuario = signal<Set<number>>(new Set());

  private cargarConUsuario(): void {
    this.PersonaService.codperConUsuario().subscribe({
      next: (ids) => this.conUsuario.set(new Set(ids)),
    });
  }
  guardarUsuario(): void {
    if (this.regFormUsuario.invalid) {
      this.regFormUsuario.markAllAsTouched();
      return;
    }
    this.accionPendiente = 'usuario';
    bootstrap.Modal.getOrCreateInstance(this.confModalElement.nativeElement).show();
  }

  private ejecutarGuardarUsuario(): void {
    const codper = this.personaUsu()?.codper;
    if (codper === undefined) return;

    const { login, passwd, estado } = this.regFormUsuario.getRawValue();
    this.usuarioService.guardarUsuario(codper, { login, passwd, estado }).subscribe({
      next: () => {
        this.cerrarModalUsuario();
        this.mostrarToast(this.tieneUsuario() ? 'Usuario modificado' : 'Usuario creado');
        this.cargarConUsuario();
      },
      error: (err) => {
        const errorObj = JSON.parse(err.error);
        this.mostrarToast(errorObj.message, 'error', 3500);
      }
    });
  }

  cerrarModalUsuario(): void {
    bootstrap.Modal.getInstance(this.usuModalElement.nativeElement)?.hide();
  }
  private armarPayload(valor: any, codper = 0): Persona {
    const { ci, telefonos, ...resto } = valor;
    const ciTxt = String(ci ?? '').trim();
    return {
      ...resto,

      datos: ciTxt ? { ci: ciTxt } : null,
      telefonos: (telefonos as string[])
        .filter(n => n?.trim())
        .map(n => ({ id: { codper, numero: n.trim() } }))
    };
  }
  paginaActual: number = 1;
  itemsPorPagina: number = 10;

  get listaPaginada(): any[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    return this.listaPer.slice(inicio, inicio + this.itemsPorPagina);
  }

  get totalPaginas(): number {
    return Math.ceil(this.listaPer.length / this.itemsPorPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  irPagina(p: number) {
    if (p >= 1 && p <= this.totalPaginas) {
      this.paginaActual = p;
    }
  }

  paginaAnterior() {
    this.irPagina(this.paginaActual - 1);
  }

  paginaSiguiente() {
    this.irPagina(this.paginaActual + 1);
  }
  protected onFotoSeleccionada(event: Event, destino: 'add' | 'mod'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      return;
    }

    if (destino === 'add') {
      this.liberarPreview(this.previewAdd);
      this.archivoAdd = file;
      this.previewAdd = URL.createObjectURL(file);
    } else {
      this.liberarPreview(this.previewMod);
      this.archivoMod = file;
      this.previewMod = URL.createObjectURL(file);
    }
  }

  private liberarPreview(url: string): void {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  }

  protected limpiarAgregar(): void {
    this.regFormAgregar.reset({ estado: 1 });
    this.telefonosAdd.clear();
    this.liberarPreview(this.previewAdd);
    this.previewAdd = '';
    this.archivoAdd = null;
  }

  private limpiarFotoMod(): void {
    this.liberarPreview(this.previewMod);
    this.previewMod = '';
    this.archivoMod = null;
  }
  prepararCambioEstado(persona: Persona, estado: number): void {
    if (persona.estado === estado) return;
    this.personaPendiente = persona;
    this.estadoPendiente = estado;
    this.accionPendiente = 'estado';
    bootstrap.Modal.getOrCreateInstance(this.confModalElement.nativeElement).show();
  }

  confirmarAccion(): void {
    const accion = this.accionPendiente;
    this.accionPendiente = null;

    switch (accion) {
      case 'agregarPersona':
        this.ejecutarEnviarDatos();
        break;
      case 'modificarPersona':
        this.ejecutarGuardarModificacion();
        break;
      case 'usuario':
        this.ejecutarGuardarUsuario();
        break;
      case 'estado':
        this.ejecutarCambioEstado();
        break;
    }
  }

  private ejecutarCambioEstado(): void {
    const persona = this.personaPendiente;
    const estado = this.estadoPendiente;

    if (persona === null || estado === null) return;

    this.cambiarEstado(persona, estado);
    this.cancelarCambioEstado();
  }

  cancelarCambioEstado(): void {
    this.personaPendiente = null;
    this.estadoPendiente = null;
    this.accionPendiente = null;
  }
  abrirFicha(persona: Persona): void {
    if (persona.codper === undefined) return;

    this.personaImp.set(persona);
    bootstrap.Modal.getOrCreateInstance(this.impModalElement.nativeElement).show();

    this.PersonaService.getPersonaById(persona.codper).subscribe({
      next: (p) => this.personaImp.set(p),
    });
  }

  protected imprimirFicha(): void {
    const p = this.personaImp();
    if (!p) return;
    this.impresion.imprimirHtml(fichaPersonaHtml(p));
  }
  protected toastVisible = false;
  protected toastMensaje = '';
  protected toastTipo: 'ok' | 'error' = 'ok';
  private toastTimer: any;

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