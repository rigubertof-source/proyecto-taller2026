import { Component, inject } from '@angular/core';
import {EventEmitter, Output } from '@angular/core';
import { AuthService } from '../../auth.service';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http'; 
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
@Output() cerrar = new EventEmitter<void>();
mensajeError = '';
  cerrarModal() {
    this.cerrar.emit();
  }
   private readonly apiService = inject(AuthService)
  private router = inject(Router);
 regForm:FormGroup

 constructor(){
    this.regForm=new FormGroup({
      login:new FormControl(''),
      password:new FormControl(''),
    })
}
 getForLogin_boton(): void {
  this.mensajeError = '';
  const login = this.regForm.get('login')?.value;
  const password = this.regForm.get('password')?.value;

  this.apiService.getLogin(login ?? '', password ?? '').subscribe({
    next: (respuesta) => {
       console.log('Respuesta:', respuesta);
      if (respuesta.status) {
        this.apiService.setCurrentSession(respuesta);
        this.cerrarModal();
      } else {
        this.mensajeError = respuesta.message || 'Credenciales incorrectas';
      }
    },
    error: (err: HttpErrorResponse) => {
      this.mensajeError =
        err.error?.message ||
        (err.status === 0
          ? 'No se pudo conectar con el servidor'
          : 'Error al iniciar sesión');
    },
  });
}
}
