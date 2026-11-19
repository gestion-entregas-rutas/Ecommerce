import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <section class="fade-in">
    <div class="mb-6 flex items-end justify-between">
      <div>
        <h1 class="font-headline-md">Carrito</h1>
        <p class="font-body-sm text-on-surface-variant mt-1">Revisa tus productos antes de pagar. Si inicias sesión, tus productos de invitado se unirán a tu cuenta.</p>
      </div>
      <a routerLink="/productos" class="font-label-md text-primary hover:underline">Seguir comprando</a>
    </div>

    <div *ngIf="message" class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 font-body-sm text-amber-900">{{message}}</div>

    <div class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6" *ngIf="cart.items().length>0; else empty">
      <div class="space-y-3">
        <article *ngFor="let item of cart.items()" class="surface-card p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
          <div class="h-24 w-24 rounded-lg bg-surface-container-low flex items-center justify-center p-2 shrink-0">
            <img *ngIf="item.imagenPrincipalUrl || item.imagenUrl" [src]="item.imagenPrincipalUrl || item.imagenUrl" class="max-h-full max-w-full object-contain" />
            <span *ngIf="!(item.imagenPrincipalUrl || item.imagenUrl)" class="material-symbols-outlined text-on-surface-variant">inventory_2</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-title-md truncate">{{item.nombre || item.productoId}}</div>
            <div class="font-body-sm text-on-surface-variant mt-1 tabular-nums">\${{(item.precioAplicado ?? item.precioUnitario ?? item.precioOferta ?? item.precioBase ?? 0) | number:'1.2-2'}} c/u</div>
            <div class="font-body-sm mt-1" [ngClass]="item.stockDisponible===0 ? 'text-status-urgent' : 'text-status-delivered'">
              {{ item.stockDisponible===0 ? 'Este producto acaba de agotarse mientras navegabas.' : 'Disponible para entrega hoy en tu zona.' }}
            </div>
            <div *ngIf="item.mensaje || item.advertencia" class="font-body-sm text-status-in-transit mt-1">{{item.mensaje || item.advertencia}}</div>
          </div>
          <div class="flex sm:flex-col items-center sm:items-end justify-between gap-3">
            <div class="inline-flex items-center rounded-lg border border-separator-hairline-light bg-white">
              <button class="h-9 w-9 hover:bg-surface-container-low rounded-l-lg" (click)="dec(item)">−</button>
              <span class="w-9 text-center font-label-md tabular-nums">{{item.cantidad}}</span>
              <button class="h-9 w-9 hover:bg-surface-container-low rounded-r-lg" (click)="inc(item)" [disabled]="item.stockDisponible!=null && item.cantidad>=item.stockDisponible">+</button>
            </div>
            <div class="font-title-md tabular-nums">\${{((item.subtotal ?? ((item.precioAplicado ?? item.precioUnitario ?? item.precioOferta ?? item.precioBase ?? 0)*item.cantidad))) | number:'1.2-2'}}</div>
            <button class="font-body-sm text-primary hover:underline" (click)="remove(item.productoId)">Quitar</button>
          </div>
        </article>
      </div>

      <aside class="surface-card p-6 h-fit lg:sticky lg:top-20">
        <h2 class="font-title-md">Resumen de compra</h2>
        <div class="mt-4 space-y-2 font-body-md">
          <div class="flex justify-between"><span class="text-on-surface-variant">Subtotal</span><span class="tabular-nums">\${{cart.subtotal() | number:'1.2-2'}}</span></div>
          <div class="flex justify-between"><span class="text-on-surface-variant">Envío</span><span>Se calcula al finalizar</span></div>
          <div class="flex justify-between"><span class="text-on-surface-variant">Retiro en tienda</span><span class="text-status-delivered font-label-md">Gratis</span></div>
        </div>
        <div class="mt-4 pt-4 border-t border-separator-hairline-light flex justify-between items-baseline">
          <span class="font-title-md">Total</span><span class="font-headline-md tabular-nums">\${{cart.subtotal() | number:'1.2-2'}}</span>
        </div>
        <div *ngIf="cart.cart()?.requiereRevision" class="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 font-body-sm text-amber-900">Detectamos cambios en stock o precio. Actualiza la cotización para continuar.</div>
        <ul *ngIf="cart.cart()?.advertencias?.length" class="mt-3 list-disc pl-5 font-body-sm text-amber-900">
          <li *ngFor="let a of cart.cart()?.advertencias">{{a}}</li>
        </ul>
        <button class="btn-primary w-full mt-5 !py-3" [disabled]="cart.items().length===0" (click)="checkout()">Continuar al pago</button>
        <button class="btn-ghost w-full mt-2" (click)="refresh()">Actualizar cotización</button>
        <p class="font-body-sm text-on-surface-variant mt-3">Puedes comprar como invitado o iniciar sesión al pagar.</p>
      </aside>
    </div>

    <ng-template #empty>
      <div class="surface-card p-12 text-center">
        <span class="material-symbols-outlined text-[40px] text-on-surface-variant/40">shopping_bag</span>
        <p class="font-title-md mt-3">Tu carrito está vacío</p>
        <p class="font-body-sm text-on-surface-variant mt-1">Agrega productos y aparecerán aquí.</p>
        <a routerLink="/productos" class="btn-primary inline-flex mt-5">Explorar catálogo</a>
      </div>
    </ng-template>
  </section>
  `,
})
export class CartPage implements OnInit {
  message = '';
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
