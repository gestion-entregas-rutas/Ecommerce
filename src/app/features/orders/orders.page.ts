import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../core/services/order.service';
import { OrdenResumen } from '../../core/models/api.models';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
  <section class="fade-in">
    <div class="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 class="font-headline-md">Mis Pedidos</h1>
        <p class="font-body-sm text-on-surface-variant mt-1">Consulta el estado de tus compras y retiros.</p>
      </div>
      <button class="btn-ghost !py-2" (click)="load()"><span class="material-symbols-outlined text-[18px]">refresh</span>Actualizar</button>
    </div>

    <div *ngIf="loading" class="surface-card p-8 text-center text-on-surface-variant">Cargando pedidos...</div>
    <div *ngIf="error" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-body-sm text-red-700">{{error}}</div>
    <div *ngIf="!loading && ordenes.length===0" class="surface-card p-10 text-center">
      <p class="font-title-md">Aún no tienes pedidos</p>
      <p class="font-body-sm text-on-surface-variant mt-1">Cuando realices una compra podrás seguirla aquí.</p>
    </div>

    <div class="space-y-4">
      <article *ngFor="let o of ordenes" class="surface-card p-5 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="chip badge-soft-blue mb-2">{{o.tipoEntrega === 'RetiroTienda' ? 'Retiro en tienda' : 'Envío a domicilio'}}</div>
            <div class="font-title-md">{{o.numeroOrden || o.ordenId}}</div>
            <div class="font-body-sm text-on-surface-variant">{{o.fechaCreacion | date:'medium'}}</div>
          </div>
          <div class="text-right">
            <div class="font-headline-md tabular-nums">\${{(o.total ?? 0) | number:'1.2-2'}}</div>
            <div class="font-body-sm text-on-surface-variant">{{o.estadoPago || o.estadoOrden || '—'}}</div>
          </div>
        </div>

        <div class="mt-6">
          <div class="flex items-center justify-between mb-2">
            <ng-container *ngFor="let s of steps; let i=index; let last=last">
              <div class="flex flex-col items-center gap-1 flex-1">
                <div class="h-2.5 w-2.5 rounded-full" [ngClass]="i <= stepIndex(o) ? 'bg-primary' : 'bg-separator-hairline-light'"></div>
                <span class="font-caption text-on-surface-variant text-center" [class.!text-primary]="i <= stepIndex(o)">{{s}}</span>
              </div>
              <div *ngIf="!last" class="h-[2px] flex-1 -mt-5" [ngClass]="i < stepIndex(o) ? 'bg-primary' : 'bg-separator-hairline-light'"></div>
            </ng-container>
          </div>
          <p class="font-body-sm mt-2">{{ statusMessage(o) }}</p>
        </div>

        <div class="mt-4 grid gap-2 font-body-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><span class="text-on-surface-variant">Estado orden:</span> {{o.estadoOrden || '—'}}</div>
          <div><span class="text-on-surface-variant">Pago:</span> {{o.estadoPago || '—'}}</div>
          <div><span class="text-on-surface-variant">Seguimiento:</span> {{o.estadoSeguimiento || '—'}}</div>
          <div *ngIf="o.codigoRetiro"><span class="text-on-surface-variant">Código retiro:</span> <strong>{{o.codigoRetiro}}</strong></div>
        </div>

        <div *ngIf="o.items?.length" class="mt-4 pt-4 border-t border-separator-hairline-light font-body-sm">
          <div class="font-label-md mb-2">Artículos</div>
          <div *ngFor="let it of o.items" class="flex justify-between py-0.5"><span class="text-on-surface-variant">{{it.nombre || it.productoId}} × {{it.cantidad}}</span><span class="tabular-nums">\${{((it.subtotal ?? 0)) | number:'1.2-2'}}</span></div>
        </div>
      </article>
    </div>
  </section>
  `,
})
export class OrdersPage implements OnInit {
  ordenes: OrdenResumen[] = [];
  loading = false; error = '';
  readonly steps = ['Confirmado', 'Preparando', 'En camino', 'Entregado'];

  constructor(private orders: OrderService) {}
  ngOnInit() { this.load(); }
  load() {
    this.loading = true; this.error = '';
    this.orders.misOrdenes().subscribe({
      next: (res: any) => { this.ordenes = Array.isArray(res) ? res : (res?.items ?? []); this.loading = false; },
      error: (e) => { this.error = e?.userMessage || 'No pudimos cargar tus pedidos.'; this.loading = false; },
    });
  }

  stepIndex(o: OrdenResumen): number {
    const s = `${o.estadoSeguimiento || ''} ${o.estadoOrden || ''} ${o.estadoPago || ''}`.toLowerCase();
    if (/entreg|retirad|complet/.test(s)) return 3;
    if (/camino|ruta|asign/.test(s)) return 2;
    if (/prepar|listo|pagad|confirm/.test(s)) return 1;
    return 0;
  }

  statusMessage(o: OrdenResumen): string {
    const i = this.stepIndex(o);
    if (o.tipoEntrega === 'RetiroTienda') {
      return ['¡Pedido confirmado! Te avisaremos cuando esté listo.', '¡Listo! Tu pedido está en preparación.', 'Tu pedido está listo para retiro en tienda.', 'Pedido retirado. ¡Gracias por tu compra!'][i];
    }
    return ['¡Pedido confirmado! Te avisaremos cuando salga a ruta.', '¡Listo! Tu pedido está en preparación.', 'Tu pedido va en camino.', 'Pedido entregado. ¡Gracias por tu compra!'][i];
  }
}
