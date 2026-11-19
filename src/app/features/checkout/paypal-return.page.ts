import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
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
            <a routerLink="/mis-pedidos" class="btn-ghost">Ver mis pedidos</a>
          </div>
        </div>

        <div *ngSwitchCase="'failed'">
          <h1 class="font-title-md text-status-urgent">El pago no se completó</h1>
          <p class="font-body-sm text-on-surface-variant mt-1">Estado: {{res()?.estadoPago}}. Puedes volver al checkout para intentarlo de nuevo.</p>
          <a routerLink="/checkout" class="btn-primary mt-6 inline-block">Volver al checkout</a>
        </div>

        <div *ngSwitchCase="'error'">
          <h1 class="font-title-md text-status-urgent">No pudimos verificar tu pago</h1>
          <p class="font-body-sm text-on-surface-variant mt-1 whitespace-pre-line">{{message()}}</p>
          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <button class="btn-primary" *ngIf="canRetry()" (click)="capturar()">Reintentar</button>
            <a routerLink="/mis-pedidos" class="btn-ghost">Consultar mis pedidos</a>
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
    this.ordenId = sessionStorage.getItem('paypal:ordenId');
    if (!this.ordenId) {
      this.canRetry.set(false);
      this.message.set('No pudimos identificar la orden a verificar. Revisa el estado de tu compra en Mis pedidos.');
      this.state.set('error');
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
          sessionStorage.removeItem('paypal:ordenId');
          this.cart.clearLocal();
          this.state.set('ok');
          this.toast.success('¡Pago realizado con éxito! Tu pedido fue confirmado.');
        } else if (estado === 'Cancelado' || estado === 'Fallido' || estado === 'Expirado') {
          sessionStorage.removeItem('paypal:ordenId');
          this.state.set('failed');
          this.toast.error('El pago no se completó. Puedes intentarlo de nuevo.');
        } else {
          this.state.set('pending');
          this.toast.warning('Tu pago aún no está confirmado. Puedes reintentar la verificación.');
        }
      },
      error: (e) => {
        this.canRetry.set(e?.status !== 409);
        this.message.set(e?.status === 409
          ? 'La orden expiró, no fue aprobada o ya no se puede capturar. Revisa Mis pedidos o inicia un nuevo checkout.'
          : (e?.userMessage || 'Ocurrió un error de conexión. Puedes reintentar con la misma orden.'));
        this.state.set('error');
        this.toast.error('No pudimos verificar tu pago. Revisa Mis pedidos o reintenta.');
      },
    });
  }
}
