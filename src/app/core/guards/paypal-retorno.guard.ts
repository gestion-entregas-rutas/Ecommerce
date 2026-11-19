import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

/**
 * PayPal vuelve a la tienda con ?token=...&PayerID=...
 * Si eso ocurre en cualquier ruta que no sea la de retorno (por ejemplo la raíz, porque el
 * ReturnUrl del backend no coincide), se reenvía a la pantalla que verifica y completa el pago.
 * En cualquier otro caso, una ruta desconocida lleva al catálogo.
 */
export const paypalRetornoGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const q = route.queryParams;
  if (q['token'] && q['PayerID']) {
    return router.createUrlTree(['/pago/paypal/retorno'], { queryParams: q });
  }
  // Ruta desconocida: al catálogo. La raíz ('') sí se muestra.
  return route.routeConfig?.path === '**' ? router.createUrlTree(['/']) : true;
};
