import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ImgFallbackDirective } from '../../core/ui/img-fallback.directive';
import { DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { CoverageService } from '../../core/services/coverage.service';
import { OrderService } from '../../core/services/order.service';
import { OrdenResumen } from '../../core/models/api.models';
import { BackLinkComponent } from '../../core/ui/back-link.component';
import { pedidoEsRetiro, pedidoGrupo, pedidoPaso, pedidoPasos } from '../../core/utils/pedido-estado';

@Component({
  standalone: true,
  imports: [RouterLink, DecimalPipe, BackLinkComponent, ImgFallbackDirective],
  template: `
  <section class="space-y-6 pb-4">
    <!-- Cabecera -->
    <div class="flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div class="flex flex-col gap-1">
        <app-back-link fallback="/productos" label="Volver a la tienda" />
        <h1 class="text-2xl font-extrabold tracking-tight text-deep md:text-[32px]">Mi cuenta</h1>
        <p class="text-sm text-on-surface-variant">Tus datos, tus pedidos y tu carrito en un solo lugar.</p>
      </div>
      <div class="flex items-center gap-1.5 self-start rounded-full bg-white px-3 py-1.5 shadow-sm md:self-center">
        <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
        <span class="material-symbols-outlined text-[16px] text-status-delivered">verified</span>
        <span class="text-[11px] font-bold uppercase tracking-wide">Cuenta activa</span>
      </div>
    </div>

    <!-- Perfil -->
    <div class="relative overflow-hidden rounded-3xl border border-separator-hairline-light bg-white p-6 shadow-sm md:p-7">
      <div class="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/5 blur-3xl"></div>
      <div class="relative z-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
        <div class="flex min-w-0 items-start gap-5 sm:items-center">
          <div class="relative shrink-0">
            <div class="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-tr from-deep to-primary text-[34px] font-extrabold text-white shadow-md shadow-primary/25 sm:h-24 sm:w-24 sm:text-[40px]">{{ inicial() }}</div>
            <span class="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 ring-4 ring-white"></span>
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate text-xl font-bold text-on-surface">{{ auth.user()?.nombreCompleto }}</h2>
              <span class="rounded-full bg-primary-fixed px-2 py-0.5 text-[11px] font-semibold text-deep">Cliente</span>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-on-surface-variant">
              <span class="inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">mail</span><span class="truncate">{{ auth.user()?.correo }}</span></span>
              @if (auth.user()?.telefono) { <span class="inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">call</span>{{ auth.user()?.telefono }}</span> }
              @if (cov.zona()) { <span class="inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">location_on</span>{{ cov.zona()?.nombre }}</span> }
            </div>
          </div>
        </div>
        <div class="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <a routerLink="/mis-pedidos" class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-system-background px-4 py-2.5 text-sm font-semibold text-on-surface transition-all hover:bg-primary-fixed"><span class="material-symbols-outlined text-[18px]">receipt_long</span>Mis pedidos</a>
          <a routerLink="/productos" class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-deep"><span class="material-symbols-outlined text-[18px]">storefront</span>Seguir comprando</a>
        </div>
      </div>

      <div class="relative z-10 mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-system-background p-3 md:grid-cols-4">
        <div class="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-primary-fixed text-primary"><span class="material-symbols-outlined text-[20px]">local_shipping</span></span>
          <div class="min-w-0"><span class="block text-base font-bold">{{ activos().length }}</span><span class="block truncate text-[11px] font-semibold text-on-surface-variant">Pedidos activos</span></div>
        </div>
        <div class="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-primary-fixed text-primary"><span class="material-symbols-outlined text-[20px]">receipt_long</span></span>
          <div class="min-w-0"><span class="block text-base font-bold">{{ ordenes().length }}</span><span class="block truncate text-[11px] font-semibold text-on-surface-variant">Pedidos en total</span></div>
        </div>
        <div class="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-primary-fixed text-primary"><span class="material-symbols-outlined text-[20px]">shopping_bag</span></span>
          <div class="min-w-0"><span class="block text-base font-bold">{{ cart.count() }} {{ cart.count()===1 ? 'producto' : 'productos' }}</span><span class="block truncate text-[11px] font-semibold text-on-surface-variant">En carrito (\${{ cart.subtotal() | number:'1.2-2' }})</span></div>
        </div>
        <div class="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-primary-fixed text-primary"><span class="material-symbols-outlined text-[20px]">pin_drop</span></span>
          <div class="min-w-0"><span class="block truncate text-base font-bold">{{ cov.zona()?.nombre || (cov.estado()==='fuera' ? 'Sin cobertura' : 'Sin elegir') }}</span><span class="block truncate text-[11px] font-semibold text-on-surface-variant">Ubicación de entrega</span></div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <!-- Izquierda -->
      <div class="flex flex-col gap-6 lg:col-span-8">

        <!-- Pedidos -->
        <div class="rounded-3xl border border-separator-hairline-light bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="grid h-10 w-10 place-items-center rounded-2xl bg-primary-fixed text-primary"><span class="material-symbols-outlined text-[22px]">package_2</span></span>
              <div>
                <h3 class="text-base font-bold">Mis pedidos y entregas</h3>
                <p class="text-xs text-on-surface-variant">Estado de tu compra más reciente en curso</p>
              </div>
            </div>
            <a routerLink="/mis-pedidos" class="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-deep">Ver historial<span class="material-symbols-outlined text-[18px]">arrow_forward</span></a>
          </div>

          @if (cargandoPedidos()) {
            <p class="rounded-2xl bg-system-background p-4 text-sm text-on-surface-variant">Cargando tus pedidos…</p>
          } @else if (reciente(); as o) {
            <div class="rounded-2xl bg-system-background p-4">
              <div class="flex flex-col justify-between gap-3 pb-3 sm:flex-row sm:items-center">
                <div class="flex items-center gap-3">
                  <span class="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white"><span class="material-symbols-outlined text-[18px]">{{ esRetiro(o) ? 'storefront' : 'local_shipping' }}</span></span>
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="break-all text-sm font-bold">Pedido {{ o.numeroOrden || o.ordenId }}</span>
                      <span class="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">{{ pasos(o)[paso(o)] }}</span>
                    </div>
                    <span class="text-xs text-on-surface-variant">{{ esRetiro(o) ? 'Retiro en tienda' : 'Entrega a domicilio' }} · Total \${{ (o.total ?? 0) | number:'1.2-2' }}</span>
                  </div>
                </div>
                <a routerLink="/mis-pedidos" class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-primary shadow-sm hover:bg-primary-fixed"><span class="material-symbols-outlined text-[16px]">visibility</span>Ver detalle</a>
              </div>
              <div class="mt-2">
                <div class="h-2 w-full overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-primary transition-all" [style.width.%]="(paso(o) / 3) * 100"></div></div>
                <div class="mt-2 flex items-center justify-between text-[11px]">
                  @for (s of pasos(o); track s; let i = $index) {
                    <span [class]="i === paso(o) ? 'font-bold text-primary' : i < paso(o) ? 'font-semibold text-on-surface' : 'text-on-surface-variant'">{{ s }}</span>
                  }
                </div>
              </div>
            </div>
          } @else {
            <div class="rounded-2xl bg-system-background p-5 text-center">
              <p class="text-sm font-semibold">No tienes pedidos en curso</p>
              <p class="mt-1 text-xs text-on-surface-variant">Cuando compres algo, aquí verás cómo avanza.</p>
              <a routerLink="/productos" class="mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-deep">Ver productos</a>
            </div>
          }
        </div>

        <!-- Carrito -->
        <div class="rounded-3xl border border-separator-hairline-light bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div class="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div class="flex items-center gap-3">
              <span class="grid h-10 w-10 place-items-center rounded-2xl bg-primary-fixed text-primary"><span class="material-symbols-outlined text-[22px]">shopping_cart</span></span>
              <div>
                <h3 class="text-base font-bold">Mi carrito</h3>
                <p class="text-xs text-on-surface-variant">
                  {{ cart.count() > 0 ? cart.count() + (cart.count()===1 ? ' producto' : ' productos') + ' · $' + (cart.subtotal() | number:'1.2-2') + ' en total' : 'Aún no agregaste productos' }}
                </p>
              </div>
            </div>
            @if (cart.count() > 0) {
              <a routerLink="/carrito" class="inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-deep">Ver carrito<span class="material-symbols-outlined text-[18px]">arrow_forward</span></a>
            }
          </div>
          @if (cart.items().length) {
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              @for (i of cart.items().slice(0, 4); track i.productoId) {
                <div class="flex items-center gap-3 rounded-2xl bg-system-background p-3 transition-colors hover:bg-primary-fixed/40">
                  <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
                    @if (i.imagenPrincipalUrl || i.imagenUrl) { <img imgFallback [src]="i.imagenPrincipalUrl || i.imagenUrl" [alt]="i.nombre || ''" class="h-full w-full object-contain" /> }
                    @else { <span class="material-symbols-outlined text-on-surface-variant">inventory_2</span> }
                  </div>
                  <div class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-bold">{{ i.nombre || i.productoId }}</span>
                    <span class="block text-xs text-on-surface-variant">Cant: {{ i.cantidad }}</span>
                    <span class="mt-0.5 block text-base font-bold text-primary">\${{ (i.subtotal ?? precio(i) * i.cantidad) | number:'1.2-2' }}</span>
                  </div>
                </div>
              }
            </div>
            @if (cart.items().length > 4) { <p class="mt-3 text-xs text-on-surface-variant">y {{ cart.items().length - 4 }} más en tu carrito</p> }
          } @else {
            <a routerLink="/productos" class="inline-flex rounded-xl bg-system-background px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-fixed">Explorar el catálogo</a>
          }
        </div>

        <!-- Ubicación -->
        <div class="rounded-3xl border border-separator-hairline-light bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="grid h-10 w-10 place-items-center rounded-2xl bg-primary-fixed text-primary"><span class="material-symbols-outlined text-[22px]">location_on</span></span>
              <div>
                <h3 class="text-base font-bold">Ubicación de entrega</h3>
                <p class="text-xs text-on-surface-variant">Con ella vemos si te llega hoy desde cualquier producto</p>
              </div>
            </div>
            <button type="button" (click)="cov.abrirSelector()" class="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-deep"><span class="material-symbols-outlined text-[18px]">edit_location_alt</span>{{ cov.estado()==='sin-ubicacion' ? 'Elegir' : 'Cambiar' }}</button>
          </div>
          <div class="flex items-start gap-3 rounded-2xl bg-system-background p-4">
            <span class="material-symbols-outlined text-[22px]" [class]="cov.estado()==='cubierta' ? 'text-status-delivered' : cov.estado()==='fuera' ? 'text-status-urgent' : 'text-primary'">{{ cov.estado()==='fuera' ? 'location_off' : 'local_shipping' }}</span>
            <div class="text-sm">
              @switch (cov.estado()) {
                @case ('cubierta') { <p class="font-bold">Entregamos en {{ cov.zona()?.nombre }}</p><p class="text-on-surface-variant">Tus pedidos a domicilio pueden llegar hoy.</p> }
                @case ('fuera') { <p class="font-bold">Aún no llegamos a tu ubicación</p><p class="text-on-surface-variant">Cambia el punto en el mapa o elige retiro en tienda al pagar.</p> }
                @default { <p class="font-bold">Aún no elegiste ubicación</p><p class="text-on-surface-variant">Márcala en el mapa para ver si te llega hoy.</p> }
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Derecha -->
      <div class="flex flex-col gap-6 lg:col-span-4">
        <div class="rounded-3xl border border-separator-hairline-light bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div class="mb-4 flex items-center gap-3">
            <span class="grid h-10 w-10 place-items-center rounded-2xl bg-primary-fixed text-primary"><span class="material-symbols-outlined text-[22px]">shield</span></span>
            <div>
              <h3 class="text-base font-bold">Sesión</h3>
              <p class="text-xs text-on-surface-variant">Tu acceso en este equipo</p>
            </div>
          </div>
          <div class="mb-4 rounded-2xl bg-system-background p-3">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined mt-0.5 text-[20px] text-primary">devices</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-bold">Sesión actual</span>
                  <span class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">Activa</span>
                </div>
                <span class="mt-0.5 block truncate text-sm font-medium">{{ auth.user()?.correo }}</span>
              </div>
            </div>
          </div>
          <button type="button" class="group flex w-full items-center justify-center gap-1.5 rounded-2xl bg-system-background px-4 py-3 text-sm font-semibold transition-all hover:bg-red-50 hover:text-status-urgent" (click)="salir()">
            <span class="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-status-urgent">logout</span>Cerrar sesión
          </button>
        </div>

        <div class="rounded-3xl border border-separator-hairline-light bg-white p-6 shadow-sm">
          <h3 class="mb-3 text-base font-bold">Accesos rápidos</h3>
          <div class="flex flex-col gap-2">
            <a routerLink="/productos" class="flex items-center justify-between rounded-2xl bg-system-background px-4 py-3 text-sm font-semibold hover:bg-primary-fixed/60"><span class="flex items-center gap-3"><span class="material-symbols-outlined text-[18px] text-primary">grid_view</span>Catálogo</span><span class="material-symbols-outlined text-[18px] text-outline">chevron_right</span></a>
            <a routerLink="/productos" [queryParams]="{soloOfertas: true}" class="flex items-center justify-between rounded-2xl bg-system-background px-4 py-3 text-sm font-semibold hover:bg-primary-fixed/60"><span class="flex items-center gap-3"><span class="material-symbols-outlined text-[18px] text-primary">sell</span>Ofertas</span><span class="material-symbols-outlined text-[18px] text-outline">chevron_right</span></a>
            <a routerLink="/mis-pedidos" class="flex items-center justify-between rounded-2xl bg-system-background px-4 py-3 text-sm font-semibold hover:bg-primary-fixed/60"><span class="flex items-center gap-3"><span class="material-symbols-outlined text-[18px] text-primary">receipt_long</span>Mis pedidos</span><span class="material-symbols-outlined text-[18px] text-outline">chevron_right</span></a>
          </div>
        </div>
      </div>
    </div>
  </section>
  `,
})
export class AccountPage implements OnInit {
  readonly auth = inject(AuthService);
  readonly cart = inject(CartService);
  readonly cov = inject(CoverageService);
  private readonly orders = inject(OrderService);
  private readonly router = inject(Router);

  readonly ordenes = signal<OrdenResumen[]>([]);
  readonly cargandoPedidos = signal(true);
  readonly activos = computed(() => this.ordenes().filter((o) => pedidoGrupo(o) === 'curso'));
  /** Pedido en curso más reciente. */
  readonly reciente = computed(() => [...this.activos()].sort((a, b) => this.fecha(b) - this.fecha(a))[0] ?? null);

  readonly esRetiro = pedidoEsRetiro;
  readonly paso = pedidoPaso;
  readonly pasos = pedidoPasos;

  ngOnInit() {
    this.orders.misOrdenes().subscribe({
      next: (res: any) => { this.ordenes.set(Array.isArray(res) ? res : (res?.items ?? [])); this.cargandoPedidos.set(false); },
      error: () => this.cargandoPedidos.set(false),
    });
  }

  private fecha(o: OrdenResumen) { return new Date(o.creadaEn || o.fechaCreacion || 0).getTime() || 0; }
  precio(i: any): number { return i.precioAplicado ?? i.precioUnitario ?? i.precioOferta ?? i.precioBase ?? 0; }
  inicial() { return (this.auth.user()?.nombreCompleto || 'C').charAt(0).toUpperCase(); }
  salir() { this.auth.logout(false); this.cart.load().subscribe({ error: () => {} }); this.router.navigateByUrl('/'); }
}
