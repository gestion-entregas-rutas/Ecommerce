import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { CartTokenService } from '../services/cart-token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const cartTokenService = inject(CartTokenService);
  const token = auth.token();
  const cartToken = cartTokenService.get();

  let headers = req.headers;
  if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  if (cartToken) headers = headers.set('X-Cart-Token', cartToken);
  return next(req.clone({ headers }));
};
