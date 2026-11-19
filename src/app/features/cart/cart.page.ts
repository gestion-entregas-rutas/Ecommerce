import { Component, OnInit, inject } from '@angular/core';
import { ImgFallbackDirective } from '../../core/ui/img-fallback.directive';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { CoverageService } from '../../core/services/coverage.service';
import { BackLinkComponent } from '../../core/ui/back-link.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, BackLinkComponent, ImgFallbackDirective],
  template: `
  <section>
    <div class="flex flex-col justify-between gap-4 pb-6 md:flex-row md:items-center">
      <div class="flex flex-col gap-1.5">
        <app-back-link fallback="/productos" label="Seguir comprando" />
        <nav class="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant" aria-label="Ruta de navegación">
          <a routerLink="/" class="flex items-center gap-1 hover:text-primary"><span class="material-symbols-outlined text-[16px]">home</span>Inicio</a>
          <span class="material-symbols-outlined text-[16px]">chevron_right</span>
          <a routerLink="/productos" class="hover:text-primary">Tienda</a>
          <span class="material-symbols-outlined text-[16px]">chevron_right</span>
          <span class="font-semibold text-on-surface">Mi carrito</span>
        </nav>
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-extrabold tracking-tight text-deep md:text-[32px]">Mi carrito</h1>
          <span *ngIf="cart.count() > 0" class="rounded-full bg-primary-fixed px-2.5 py-1 text-xs font-bold text-deep">{{cart.count()}} {{ cart.count()===1 ? 'producto' : 'productos' }}</span>
        </div>
        <p class="max-w-2xl text-sm text-on-surface-variant">Revisa tus artículos antes de pasar al pago. Si inicias sesión, los que agregaste como invitado se suman a tu cuenta.</p>
      </div>
      <a routerLink="/productos" class="group inline-flex items-center gap-2 self-start rounded-xl border border-separator-hairline-light bg-white px-4 py-2.5 text-[13px] font-semibold text-primary shadow-sm transition-all hover:bg-primary-fixed md:self-auto">
        <span class="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">arrow_back</span>Seguir explorando
      </a>
    </div>

    <div *ngIf="message" class="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 font-body-sm text-amber-900" role="alert">{{message}}</div>

    <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-12" *ngIf="cart.items().length>0; else empty">
      <div class="flex flex-col gap-6 lg:col-span-8">

        <!-- Cobertura: ¿te llega hoy? -->
        <div class="relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl p-5 shadow-sm"
             [ngClass]="cov.estado()==='fuera' ? 'border border-amber-200 bg-amber-50' : 'bg-gradient-to-r from-primary/10 via-primary-fixed/50 to-white'">
          <div class="flex items-center gap-3.5">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-md" [ngClass]="cov.estado()==='fuera' ? 'bg-status-in-transit' : 'bg-primary shadow-primary/20'">
              <span class="material-symbols-outlined text-[22px]" style="font-variation-settings:'FILL' 1">{{ cov.estado()==='fuera' ? 'location_off' : 'local_shipping' }}</span>
            </span>
            <div>
              <ng-container [ngSwitch]="cov.estado()">
                <p *ngSwitchCase="'cubierta'" class="font-label-md !text-[14px]">Entregamos en <strong>{{cov.zona()?.nombre}}</strong></p>
                <p *ngSwitchCase="'fuera'" class="font-label-md !text-[14px]">Aún no llegamos a tu ubicación</p>
                <p *ngSwitchDefault class="font-label-md !text-[14px]">¿Dónde recibes tu pedido?</p>
              </ng-container>
              <p class="text-[13px] text-on-surface-variant">
                {{ cov.estado()==='cubierta' ? 'Tu compra puede llegar hoy. El costo se confirma al pagar.' : cov.estado()==='fuera' ? 'Cambia el punto en el mapa o elige retiro en tienda al pagar.' : 'Elige tu ubicación para saber si te llega hoy.' }}
              </p>
            </div>
          </div>
          <button type="button" class="shrink-0 rounded-lg px-3 py-2 text-[13px] font-semibold text-primary hover:bg-white/70" (click)="cov.abrirSelector()">{{ cov.estado()==='sin-ubicacion' ? 'Elegir' : 'Cambiar' }}</button>
        </div>

        <!-- Productos -->
        <article *ngFor="let item of cart.items()" class="relative flex flex-col gap-5 rounded-2xl border border-separator-hairline-light bg-white p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:flex-row sm:p-6">
          <div class="relative flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-system-background sm:w-36">
            <img imgFallback *ngIf="item.imagenPrincipalUrl || item.imagenUrl" [src]="item.imagenPrincipalUrl || item.imagenUrl" [alt]="item.nombre || ''" class="h-full w-full object-contain p-3" />
            <span *ngIf="!(item.imagenPrincipalUrl || item.imagenUrl)" class="material-symbols-outlined text-[36px] text-on-surface-variant/40">inventory_2</span>
            <span *ngIf="descuento(item) as d" class="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-bold text-primary">-{{d}}%</span>
          </div>

          <div class="flex flex-1 flex-col justify-between gap-4">
            <div>
              <div class="flex items-start justify-between gap-3">
                <h3 class="min-w-0 text-[15px] font-bold leading-snug text-on-surface">{{item.nombre || item.productoId}}</h3>
                <div class="shrink-0 text-right">
                  <span class="block text-xl font-extrabold tabular-nums text-on-surface">\${{ totalLinea(item) | number:'1.2-2' }}</span>
                  <span *ngIf="descuento(item)" class="text-xs text-on-surface-variant line-through tabular-nums">\${{ (item.precioBase || 0) * item.cantidad | number:'1.2-2' }}</span>
                </div>
              </div>
              <p class="mt-1 text-xs text-on-surface-variant tabular-nums">\${{ precio(item) | number:'1.2-2' }} c/u</p>
              <div class="mt-2.5 flex flex-wrap items-center gap-3">
                <span class="inline-flex items-center gap-1.5 text-xs font-medium" [ngClass]="item.stockDisponible===0 ? 'text-status-urgent' : 'text-on-surface-variant'">
                  <span class="h-2 w-2 rounded-full" [ngClass]="item.stockDisponible===0 ? 'bg-status-urgent' : 'bg-emerald-500'"></span>
                  {{ item.stockDisponible===0 ? 'Se agotó mientras navegabas' : 'En stock' }}
                </span>
                <span *ngIf="item.mensaje || item.advertencia" class="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900">{{item.mensaje || item.advertencia}}</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div class="inline-flex items-center rounded-full bg-primary-fixed/60 p-1 shadow-inner" role="group" aria-label="Cantidad">
                <button class="grid h-8 w-8 place-items-center rounded-full bg-white text-on-surface transition-colors hover:bg-primary-fixed focus:outline-none" (click)="dec(item)" aria-label="Quitar una unidad"><span class="material-symbols-outlined text-[18px]">remove</span></button>
                <span class="w-10 text-center text-sm font-bold tabular-nums">{{item.cantidad}}</span>
                <button class="grid h-8 w-8 place-items-center rounded-full bg-white text-on-surface transition-colors hover:bg-primary-fixed focus:outline-none disabled:opacity-40" (click)="inc(item)" [disabled]="item.stockDisponible!=null && item.cantidad>=item.stockDisponible" aria-label="Agregar una unidad"><span class="material-symbols-outlined text-[18px]">add</span></button>
              </div>
              <button class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-on-surface-variant transition-colors hover:bg-red-50 hover:text-status-urgent" (click)="remove(item.productoId)">
                <span class="material-symbols-outlined text-[18px]">delete</span>Eliminar
              </button>
            </div>
          </div>
        </article>
      </div>

      <!-- Resumen -->
      <div class="flex flex-col gap-4 lg:sticky lg:top-24 lg:col-span-4">
        <aside class="flex flex-col gap-6 rounded-2xl border border-separator-hairline-light bg-white p-6 shadow-sm sm:p-7" aria-label="Resumen del pedido">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold tracking-tight text-deep">Resumen del pedido</h2>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-on-surface-variant">Paso 1 de 2</span>
          </div>

          <dl class="space-y-3.5 text-sm">
            <div class="flex items-center justify-between text-on-surface-variant">
              <dt>Subtotal ({{cart.count()}} {{ cart.count()===1 ? 'producto' : 'productos' }})</dt>
              <dd class="text-base font-semibold tabular-nums text-on-surface">\${{cart.subtotal() | number:'1.2-2'}}</dd>
            </div>
            <div class="flex items-center justify-between text-on-surface-variant">
              <dt>Envío a domicilio</dt>
              <dd class="text-xs font-medium">{{ cov.estado()==='cubierta' ? 'Se calcula al pagar' : 'Según tu ubicación' }}</dd>
            </div>
            <div class="flex items-center justify-between text-on-surface-variant">
              <dt>Retiro en tienda</dt>
              <dd class="rounded-full bg-primary-fixed px-2.5 py-0.5 text-xs font-bold text-primary">Gratis</dd>
            </div>
          </dl>

          <div class="border-t border-slate-100"></div>

          <div class="flex flex-col gap-2.5">
            <div class="flex items-baseline justify-between">
              <span class="text-base font-bold leading-tight">Total a pagar</span>
              <span class="text-3xl font-extrabold tabular-nums tracking-tight text-primary">\${{cart.subtotal() | number:'1.2-2'}}</span>
            </div>
            <div *ngIf="ahorro() > 0" class="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <span class="material-symbols-outlined text-[18px]">savings</span>
              <span>Ahorras \${{ahorro() | number:'1.2-2'}} en esta orden</span>
            </div>
          </div>

          <div *ngIf="cart.cart()?.requiereRevision" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">El stock o el precio cambió. Actualiza el carrito para continuar.</div>
          <ul *ngIf="cart.cart()?.advertencias?.length" class="list-disc pl-5 text-[13px] text-amber-900">
            <li *ngFor="let a of cart.cart()?.advertencias">{{a}}</li>
          </ul>

          <div class="flex flex-col gap-2.5">
            <button class="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-white shadow-md shadow-primary/25 transition-all hover:bg-deep active:scale-[0.99] disabled:opacity-45" [disabled]="cart.items().length===0" (click)="checkout()">
              <span>Continuar al pago</span>
              <span class="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
            <button class="flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-on-surface-variant transition-colors hover:text-on-surface" (click)="refresh()">
              <span class="material-symbols-outlined text-[18px]">refresh</span>Actualizar carrito
            </button>
          </div>
          <p class="flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-on-surface-variant">
            <span class="material-symbols-outlined text-[18px] text-primary">lock</span>Pagas en el siguiente paso, con PayPal, tarjeta o transferencia
          </p>
        </aside>

        <div *ngIf="cov.estado()==='cubierta'" class="flex items-center gap-3 rounded-xl border border-separator-hairline-light bg-white p-4 shadow-sm">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-fixed text-primary"><span class="material-symbols-outlined text-[22px]">local_shipping</span></span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-bold">Entrega a {{cov.zona()?.nombre}}</p>
            <p class="truncate text-xs text-on-surface-variant">Eliges fecha y hora al pagar</p>
          </div>
        </div>
      </div>
    </div>

    <ng-template #empty>
      <div class="surface-card p-12 text-center">
        <span class="material-symbols-outlined text-[40px] text-on-surface-variant/40">shopping_bag</span>
        <p class="font-title-md mt-3">Tu carrito está vacío</p>
        <p class="mt-1 font-body-sm text-on-surface-variant">Agrega productos y aparecerán aquí.</p>
        <a routerLink="/productos" class="btn-primary mt-5 inline-flex">Ver productos</a>
      </div>
    </ng-template>
  </section>
  `,
})
export class CartPage implements OnInit {
  readonly cov = inject(CoverageService);
  message = '';
  precio(i: any): number { return i.precioAplicado ?? i.precioUnitario ?? i.precioOferta ?? i.precioBase ?? 0; }
  totalLinea(i: any): number { return i.subtotal ?? this.precio(i) * i.cantidad; }
  /** Porcentaje de descuento frente al precio base (0 si no hay oferta). */
  descuento(i: any): number { return i.precioBase && this.precio(i) < i.precioBase ? Math.round((1 - this.precio(i) / i.precioBase) * 100) : 0; }
  ahorro(): number { return this.cart.items().reduce((a, i: any) => a + (i.precioBase && this.precio(i) < i.precioBase ? (i.precioBase - this.precio(i)) * i.cantidad : 0), 0); }
  constructor(public cart: CartService, private auth: AuthService, private router: Router) {}
  ngOnInit() { this.refresh(); }
  refresh() { this.cart.cotizacion().subscribe({ error: () => this.cart.load().subscribe({ error: () => {} }) }); }
  inc(item: any) { this.cart.updateItem(item.productoId, item.cantidad + 1).subscribe({ error: (e) => this.message = e?.userMessage }); }
  dec(item: any) { const q = item.cantidad - 1; if (q <= 0) return this.remove(item.productoId); this.cart.updateItem(item.productoId, q).subscribe({ error: (e) => this.message = e?.userMessage }); }
  remove(id: string) { this.cart.removeItem(id).subscribe({ error: (e) => this.message = e?.userMessage }); }
  checkout() {
    if (!this.auth.isAuthenticated() || !this.auth.isCliente()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    this.router.navigateByUrl('/checkout');
  }
}
