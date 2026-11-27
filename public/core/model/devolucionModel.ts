export interface DevolPrestamo {
    codp: number;
    fecha: string;
    fini: string;
    ffin: string;
    tipopres: number;
    ci: number;
    nombre: string;
    ap: string;
    am: string | null;
    pendiente: boolean;
    codinvs: number[];
}
export interface DevolucionRequest {
    codp: number;
    codinvs: number[];
    login: string;
}
export interface DevolucionLista {
    codd: number;
    fecha: string;
    estado: number;
    codp: number;
    ci: number;
    nombre: string;
    ap: string;
    am: string | null;
}
export interface DetalleDevol {
    codinv: number;
    titulo: string;
}