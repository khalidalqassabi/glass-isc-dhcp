import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const creds = auth.credentials();
  if (!creds) return next(req);

  return next(
    req.clone({ setHeaders: { Authorization: `Basic ${creds}` } })
  );
};
