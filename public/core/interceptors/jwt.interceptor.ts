import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../features/auth/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  const session = authService.getCurrentSession();
  if (session?.jwt) {
    const clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${session.jwt}`
      }
    });
    return next(clonedReq);
  }
  return next(req);
};