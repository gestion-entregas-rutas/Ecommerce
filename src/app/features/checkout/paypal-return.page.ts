import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { borrarPayPalPendiente, leerPayPalPendiente } from '../../core/utils/paypal-pendiente';
import { mensajeDeError } from '../../core/errors/error-messages';
import { CheckoutResponse } from '../../core/models/api.models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <section class="fade-in mx-auto max-w-xl py-10">
    <div class="surface-card p-8 text-center">
      <ng-container [ngSwitch]="state()">
        <div *ngSwitchCase="'loading'">
          <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <h1 class="font-title-md mt-4">Verificando tu pago con PayPal...</h1>
          <p class="font-body-sm text-on-surface-variant mt-1">No cierres esta ventana.</p>
        </div>

        <div *ngSwitchCase="'ok'">
          <h1 class="font-headline-md text-status-delivered">¡Pago confirmado!</h1>
          <div class="mt-4 grid gap-1 font-body-sm text-left">
            <div><span class="text-on-surface-variant">Orden:</span> <strong>{{res()?.numeroOrden || res()?.ordenId}}</strong></div>
            <div *ngIf="res()?.totalPagado ?? res()?.total as t"><span class="text-on-surface-variant">Total:</span> <span class="tabular-nums">\${{t | number:'1.2-2'}}</span></div>
            <div *ngIf="res()?.codigoRetiro"><span class="text-on-surface-variant">Código de retiro:</span> <strong>{{res()?.codigoRetiro}}</strong></div>
            <div *ngIf="res()?.pedidoLogisticoId"><span class="text-on-surface-variant">Seguimiento:</span> {{res()?.estadoSeguimiento || 'Pendiente'}}</div>
          </div>
          <a routerLink="/mis-pedidos" class="btn-primary mt-6 inline-block">Ver mis pedidos</a>
        </div>

        <div *ngSwitchCase="'pending'">
          <h1 class="font-title-md text-status-in-transit">Tu pago aún no está confirmado</h1>
          <p class="font-body-sm text-on-surface-variant mt-1">Estado actual: {{res()?.estadoPago || 'Pendiente'}}. No se ha mostrado como pagado.</p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <button class="btn-primary" (click)="capturar()">Reintentar verificación</button>
            <a routerLink="/mis-pedidos" class="btn-ghost">Completar pago en Mis pedidos</a>
          </div>
        </div>

        <div *ngSwitchCase="'failed'">
          <h1 class="font-title-md text-status-urgent">El pago no se completó</h1>
          <p class="font-body-sm text-on-surface-variant mt-1">Estado: {{res()?.estadoPago}}. Puedes volver al checkout para intentarlo de nuevo.</p>
          <a routerLink="/mis-pedidos" class="btn-primary mt-6 inline-block">Completar el pago en Mis pedidos</a>
        </div>

        <div *ngSwitchCase="'error'">
          <h1 class="font-title-md text-status-urgent">No pudimos verificar tu pago</h1>
          <p class="font-body-sm text-on-surface-variant mt-1 whitespace-pre-line">{{message()}}</p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <button class="btn-primary" *ngIf="canRetry()" (click)="capturar()">Reintentar</button>
            <a routerLink="/mis-pedidos" class="btn-primary">Ir a Mis pedidos y completar el pago</a>
          </div>
        </div>
      </ng-container>
    </div>
  </section>
  `,
})
export class PayPalReturnPage implements OnInit {
  state = signal<'loading' | 'ok' | 'pending' | 'failed' | 'error'>('loading');
  res = signal<CheckoutResponse | null>(null);
  message = signal('');
  canRetry = signal(true);
  private ordenId: string | null = null;
  private readonly toast = inject(ToastService);

  constructor(private orders: OrderService, private cart: CartService, private router: Router) {}

  ngOnInit() {
    this.ordenId = leerPayPalPendiente()?.ordenId ?? null;
    if (!this.ordenId) {
      // Volvió de PayPal pero no sabemos qué pedido era: se envía a Mis pedidos, donde puede completarlo.
      this.toast.info('Volviste de PayPal. Si tu pago no se confirmó, termínalo con «Completar pago» en tu pedido.');
      this.router.navigateByUrl('/mis-pedidos');
      return;
    }
    this.capturar();
  }

  capturar() {
    if (!this.ordenId) return;
    this.state.set('loading');
    this.orders.capturarPayPal(this.ordenId).subscribe({
      next: (r) => {
        this.res.set(r);
        const estado = r?.estadoPago;
        if (estado === 'Confirmado') {
          borrarPayPalPendiente();
          this.cart.clearLocal();
          this.state.set('ok');
          this.toast.success('¡Pago realizado con éxito! Tu pedido fue confirmado.');
        } else if (estado === 'Cancelado' || estado === 'Fallido' || estado === 'Expirado') {
          borrarPayPalPendiente();
          this.state.set('failed');
          this.toast.error('El pago no se completó. Puedes intentarlo de nuevo.');
        } else {
          this.state.set('pending');
          this.toast.warning('Tu pago aún no está confirmado. Puedes reintentar la verificación.');
        }
      },
      error: (e) => {
        const codigo = e?.code || e?.problem?.codigo;
        this.canRetry.set(e?.status !== 409);
        this.message.set(
          codigo === 'PAYPAL_CAPTURA_NO_CONFIRMADA' || codigo === 'PAYPAL_ORDEN_NO_ENCONTRADA'
            ? 'PayPal todavía no confirma tu pago. Si no llegaste a aprobarlo, termínalo desde Mis pedidos con «Completar pago». No se te cobró nada.'
            : e?.status === 409
              ? (mensajeDeError(e) || 'La orden expiró o ya no se puede cobrar. Revisa Mis pedidos o inicia una nueva compra.')
              : mensajeDeError(e));
        this.state.set('error');
        this.toast.error('No pudimos verificar tu pago. Revisa Mis pedidos o reintenta.');
      },
    });
  }
}
