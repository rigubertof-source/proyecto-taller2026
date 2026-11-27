import { Routes } from '@angular/router';
import { Menu } from './features/menu/menu';
import { Login } from './features/auth/login/login/login';
import { ProccesoP2 } from './features/gestion-personas/procceso-p2';
import { PagPrincipal } from './shared/components/pag-principal/pag-principal';
import { Informacion } from './shared/components/informacion/informacion';
import { Contacto } from './shared/components/contacto/contacto';
import { GestionAreas } from './features/gestion-areas/gestion-areas';
import { GestionEditoriales } from './features/gestion-editoriales/gestion-editoriales';
import { GestionTipos } from './features/gestion-tipos/gestion-tipos';
import { GestionAutores } from './features/gestion-autores/gestion-autores';
import { GestionTextos } from './features/gestion-textos/gestion-textos';
import { GestionRoles } from './features/gestion-roles/gestion-roles';
import { GestionMenus } from './features/gestion-menus/gestion-menus';
import { AsignarProcesos } from './features/asignar-procesos/asignar-procesos';
import { GestionProcesos } from './features/gestion-procesos/gestion-procesos';
import { AsignarMenus } from './features/asignar-menus/asignar-menus';
import { AsignarRoles } from './features/asignar-roles/asignar-roles';
import { GestionEjemplares } from './features/gestion-ejemplares/gestion-ejemplares';
import { GestionPrestamos } from './features/gestion-prestamos/gestion-prestamos';
import { GestionDevoluciones } from './features/gestion-devoluciones/gestion-devoluciones';
import { AnularDevoluciones } from './features/anular-devoluciones/anular-devoluciones';
import { BusquedaEjemplares } from './features/busqueda-ejemplares/busqueda-ejemplares';

export const routes: Routes = [
    { path: '', redirectTo: 'principal', pathMatch: 'full' },
    { path: 'principal', component: BusquedaEjemplares },
    { path: 'menu', component: Menu },
    { path: 'login', component: Login },
    { path: 'proceso2', component: ProccesoP2 },
    { path: 'proceso3', component: GestionEditoriales },
    { path: 'principal', component: PagPrincipal },
    { path: 'info', component: Informacion },
    { path: 'contacto', component: Contacto },
    { path: 'areas', component: GestionAreas },
    { path: 'tipos', component: GestionTipos },
    { path: 'autores', component: GestionAutores },
    { path: 'menus', component: GestionMenus },
    { path: 'asignarproceso', component: AsignarProcesos},
    { path: 'procesos', component: GestionProcesos},
    { path: 'asignarmenu', component: AsignarMenus},
    { path: 'asignarroles', component: AsignarRoles},
    { path: 'gestiontextos', component: GestionTextos },
    { path: 'gestionejemplares', component: GestionEjemplares },
    { path: 'gestionprestamo', component: GestionPrestamos },
    { path: 'gestiondevoluciones', component: GestionDevoluciones },
    { path: 'anulardevol', component: AnularDevoluciones },
]