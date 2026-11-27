import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Data {
  username: string;
  nombre: string;
  fecha: string;
  message: string;
  jwt: string;
  status: boolean;
  foto?: string;
  codper:number;
  telefono?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly urlApi = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<Data | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  constructor() {
    const saved = this.getCurrentSession();
    if (saved) {
      this.currentUserSubject.next(saved);
    }
  }
  getLogin(xlogin: string, xpass: string): Observable<Data> {
    const body = { login: xlogin, password: xpass };
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }),
    };

    return this.http.post<Data>(
      this.urlApi + '/auth/login',
      body,
      httpOptions
    );
    
  }
private readonly SESSION_KEY = 'currentUser';

setCurrentSession(data: Data): void {
  localStorage.setItem(this.SESSION_KEY, JSON.stringify(data));
  this.currentUserSubject.next(data);
}
actualizarFoto(foto: string): void {
  const actual = this.getCurrentSession();
  if (!actual) return;
  this.setCurrentSession({ ...actual, foto });
}
getCurrentSession(): Data | null {
  const data = localStorage.getItem(this.SESSION_KEY);
  return data ? (JSON.parse(data) as Data) : null;
}

clearSession(): void {
  localStorage.removeItem(this.SESSION_KEY);
  this.currentUserSubject.next(null);
}
}