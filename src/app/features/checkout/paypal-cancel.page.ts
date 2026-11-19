import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
  <section class="fade-in mx-auto max-w-xl py-10">
    <div class="surface-card p-8 text-center">
      <h1 class="font-title-md text-status-in-transit">Pago cancelado</h1>
      <p class="font-body-sm text-on-surface-variant mt-2">No se confirmó ningún pago en PayPal. Tu orden pendiente expirará y liberará la reserva automáticamente.</p>
      <div class="mt-6 flex flex-wrap justify-center gap-2">
        <a routerLink="/mis-pedidos" class="btn-primary">Completar el pago en Mis pedidos</a>
        <a routerLink="/carrito" class="btn-ghost">Volver al carrito</a>
      </div>
    </div>
  </section>
  `,
})
export class PayPalCancelPage {
  constructor() { inject(ToastService).info('Cancelaste el pago en PayPal. No se realizó ningún cobro.'); }
}
