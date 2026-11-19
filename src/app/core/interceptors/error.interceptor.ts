import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CartTokenService } from '../services/cart-token.service';
import { mensajeDeError } from '../errors/error-messages';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const cartTokenService = inject(CartTokenService);
  const router = inject(Router);

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const headerToken = event.headers.get('X-Cart-Token') || event.headers.get('x-cart-token');
        const bodyToken = (event.body as any)?.tokenInvitado ?? (event.body as any)?.cartToken;
        if (headerToken) cartTokenService.set(headerToken);
        if (bodyToken) cartTokenService.set(bodyToken);
      }
    }),
    catchError((err: HttpErrorResponse) => {
      const body = err.error || {};
      const enriched = {
        ...err,
        userMessage: mensajeDeError(err),
        code: body?.codigo || body?.code,
        problem: body,
      } as HttpErrorResponse & { userMessage: string; code?: string; problem: any };

      if (err.status === 401) {
        const isAuthCall = req.url.includes('/autenticacion/login') || req.url.includes('/autenticacion/registro');
        if (!isAuthCall) {
          const returnUrl = router.url && router.url !== '/login' ? router.url : undefined;
          auth.handleUnauthorized(returnUrl);
        }
      }
      return throwError(() => enriched);
    }),
  );
};
