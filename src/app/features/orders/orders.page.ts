import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { OrdenDetalleMia, OrdenResumen } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';
import { borrarPayPalPendiente, guardarPayPalPendiente } from '../../core/utils/paypal-pendiente';
import { BackLinkComponent } from '../../core/ui/back-link.component';

type FiltroTipo = 'todos' | 'domicilio' | 'retiro';
type FiltroEstado = 'todos' | 'pendiente' | 'curso' | 'completado' | 'cancelado';

interface LineaPedido { nombre: string; cantidad: number; precio: number; subtotal: number; imagenUrl?: string | null; }

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BackLinkComponent],
  template: `
  <section class="space-y-8">
    <div>
      <app-back-link fallback="/mi-cuenta" label="Volver" />
      <nav class="mb-2 flex items-center gap-1.5 text-xs font-medium text-on-surface-variant" aria-label="Ruta de navegación">
        <a routerLink="/" class="hover:text-primary">Inicio</a>
        <span class="material-symbols-outlined text-[16px]">chevron_right</span>
        <a routerLink="/mi-cuenta" class="hover:text-primary">Mi cuenta</a>
        <span class="material-symbols-outlined text-[16px]">chevron_right</span>
        <span class="font-semibold text-on-surface">Mis pedidos</span>
      </nav>
      <header class="flex flex-col justify-between gap-4 border-b border-separator-hairline-light pb-6 md:flex-row md:items-end">
        <div>
          <h1 class="flex flex-wrap items-center gap-2.5 text-2xl font-extrabold tracking-tight text-deep lg:text-[32px]">
            Mis pedidos
            <span *ngIf="enCurso() > 0" class="rounded-full bg-primary-fixed px-2.5 py-0.5 text-xs font-bold text-deep">{{enCurso()}} {{ enCurso()===1 ? 'activo' : 'activos' }}</span>
          </h1>
          <p class="mt-1 text-sm text-on-surface-variant">Estado de cada compra, entrega y retiro.</p>
        </div>
        <button class="flex items-center gap-1.5 self-start rounded-xl border border-separator-hairline-light bg-white px-3.5 py-2 text-xs font-semibold text-primary shadow-sm hover:border-primary md:self-auto" (click)="load()" [disabled]="loading()">
          <span class="material-symbols-outlined text-[18px]" [class.animate-spin]="loading()">refresh</span>Actualizar
        </button>
      </header>
    </div>

    <div *ngIf="loading() && ordenes().length===0" class="surface-card p-10 text-center text-on-surface-variant">Cargando tus pedidos…</div>
    <div *ngIf="error()" class="rounded-xl border border-red-200 bg-red-50 p-4 font-body-sm text-red-700" role="alert">{{error()}}</div>

    <!-- Pedido en curso: lo primero que se quiere saber -->
    <article *ngIf="destacado() as d" class="relative overflow-hidden rounded-2xl border border-[#D9BDF2] bg-gradient-to-br from-white via-[#FAF7FD] to-[#F1E6F8] p-6 shadow-md lg:p-7" aria-label="Pedido en curso">
      <div class="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div class="flex items-start gap-4">
          <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-deep text-white shadow-lg shadow-primary/30">
            <span class="material-symbols-outlined text-[28px]">{{ esRetiro(d) ? 'storefront' : 'local_shipping' }}</span>
          </span>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="inline-flex items-center gap-2 rounded-full border border-[#D9BDF2] bg-primary-fixed px-3 py-1 text-xs font-bold text-deep">
                <span class="relative flex h-2.5 w-2.5"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70"></span><span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary"></span></span>
                {{ stepsFor(d)[stepIndex(d)] }}
              </span>
              <span class="rounded-md border border-separator-hairline-light bg-white px-2 py-0.5 font-mono text-xs text-on-surface-variant">{{d.numeroOrden || d.ordenId}}</span>
            </div>
            <h2 class="mt-2 text-xl font-bold tracking-tight text-deep">{{ statusMessage(d) }}</h2>
            <p class="mt-1 text-sm text-on-surface-variant">{{ esRetiro(d) ? 'Retiro en tienda' : 'Entrega a domicilio' }} · Total <strong class="text-on-surface">\${{(d.total ?? 0) | number:'1.2-2'}}</strong></p>
          </div>
        </div>
        <div *ngIf="esRetiro(d) && d.codigoRetiro" class="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center">
          <div class="text-xs font-semibold text-status-delivered">Código de retiro</div>
          <div class="text-xl font-extrabold tracking-widest text-status-delivered">{{d.codigoRetiro}}</div>
        </div>
      </div>

      <ol class="relative mt-7 grid grid-cols-4 border-t border-[#E6D3F5] pt-6" aria-label="Progreso del pedido">
        <div class="absolute left-[12.5%] right-[12.5%] top-[2.9rem] h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div class="h-full rounded-full bg-gradient-to-r from-primary to-[#A66BEA] transition-all duration-500" [style.width.%]="(stepIndex(d) / 3) * 100"></div>
        </div>
        <li *ngFor="let s of stepsFor(d); let i=index" class="relative z-10 flex flex-col items-center text-center">
          <span class="grid h-9 w-9 place-items-center rounded-full ring-4 ring-white" [ngClass]="i <= stepIndex(d) ? 'bg-primary text-white' : 'border-2 border-slate-300 bg-white text-slate-400'">
            <span class="material-symbols-outlined text-[18px]">{{ i < stepIndex(d) ? 'check' : iconoPaso(d, i) }}</span>
          </span>
          <span class="mt-2.5 text-xs" [ngClass]="i === stepIndex(d) ? 'font-extrabold text-primary' : i < stepIndex(d) ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant'">{{s}}</span>
        </li>
      </ol>
    </article>

    <!-- Filtros -->
    <div class="space-y-3">
      <div class="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0" role="group" aria-label="Filtrar por estado">
          <button *ngFor="let f of estados" type="button" class="whitespace-nowrap rounded-xl px-4 py-2 text-xs transition-all active:scale-95"
                  [ngClass]="estado()===f.id ? 'bg-deep font-bold text-white shadow-md' : 'border border-separator-hairline-light bg-white font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-primary'"
                  (click)="estado.set(f.id)">{{f.label}} ({{conteoEstado(f.id)}})</button>
        </div>
        <div class="relative min-w-[240px] md:w-80">
          <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
          <input class="w-full rounded-xl border border-separator-hairline-light bg-white py-2 pl-9 pr-3 text-xs shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Buscar por número de orden o producto" [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)" name="busqueda" aria-label="Buscar pedidos" />
        </div>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span class="font-semibold text-on-surface-variant">Modalidad:</span>
        <div class="segmented-ios">
          <button type="button" [class.active]="tipo()==='todos'" (click)="tipo.set('todos')">Todas ({{conteoTipo('todos')}})</button>
          <button type="button" [class.active]="tipo()==='domicilio'" (click)="tipo.set('domicilio')">A domicilio ({{conteoTipo('domicilio')}})</button>
          <button type="button" [class.active]="tipo()==='retiro'" (click)="tipo.set('retiro')">Retiro ({{conteoTipo('retiro')}})</button>
        </div>
      </div>
    </div>

    <div *ngIf="!loading() && ordenes().length===0 && !error()" class="surface-card p-12 text-center">
      <span class="material-symbols-outlined text-[40px] text-on-surface-variant/40">receipt_long</span>
      <p class="font-title-md mt-3">Aún no tienes pedidos</p>
      <p class="mt-1 font-body-sm text-on-surface-variant">Cuando compres algo podrás seguirlo aquí.</p>
      <a routerLink="/productos" class="btn-primary mt-5 inline-flex">Ver productos</a>
    </div>
    <div *ngIf="!loading() && ordenes().length>0 && filtradas().length===0" class="surface-card p-12 text-center">
      <p class="font-title-md">No hay pedidos con estos filtros</p>
      <button class="btn-ghost mt-4" (click)="limpiar()">Quitar filtros</button>
    </div>

    <!-- Lista -->
    <div class="flex flex-col gap-5">
      <article *ngFor="let o of filtradas()" class="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-separator-hairline-light bg-white p-6 shadow-sm">
        <span *ngIf="grupo(o)==='curso'" class="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-primary to-[#A66BEA]"></span>

        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div class="flex min-w-0 flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-2.5">
              <h3 class="break-all text-base font-bold text-deep">{{o.numeroOrden || o.ordenId}}</h3>
              <button type="button" class="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary" (click)="copiar(o.numeroOrden || o.ordenId)" title="Copiar número de orden">
                <span class="material-symbols-outlined text-[15px]">content_copy</span>Copiar
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-on-surface-variant">
              <span>{{(o.creadaEn || o.fechaCreacion) | date:'dd MMM yyyy, HH:mm'}}</span><span aria-hidden="true">•</span>
              <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">{{ esRetiro(o) ? 'storefront' : 'home' }}</span>{{ esRetiro(o) ? 'Retiro en tienda' : 'Entrega a domicilio' }}</span><span aria-hidden="true">•</span>
              <span class="font-medium text-on-surface">Pago {{ humanizar(o.estadoPago).toLowerCase() }}</span>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <span class="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Total</span>
              <span class="text-2xl font-extrabold tracking-tight">\${{(o.total ?? 0) | number:'1.2-2'}}</span>
            </div>
            <span class="rounded-full px-3 py-1 text-xs font-bold" [ngClass]="badgeEstado(o)">{{etiquetaEstado(o)}}</span>
          </div>
        </div>

        <ng-container *ngIf="lineas(o).length; else sinDetalle">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div *ngFor="let l of lineas(o)" class="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-system-background p-3">
              <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-separator-hairline-light bg-white p-1">
                <img *ngIf="l.imagenUrl" [src]="l.imagenUrl" [alt]="l.nombre" class="h-full w-full object-contain" />
                <span *ngIf="!l.imagenUrl" class="material-symbols-outlined text-on-surface-variant">inventory_2</span>
              </div>
              <div class="min-w-0 flex-1">
                <h4 class="truncate text-xs font-bold">{{l.nombre}}</h4>
                <p class="mt-0.5 text-[11px] text-on-surface-variant">{{l.cantidad}} {{ l.cantidad===1 ? 'unidad' : 'unidades' }} × \${{l.precio | number:'1.2-2'}}</p>
                <span class="mt-1 block text-xs font-extrabold">\${{l.subtotal | number:'1.2-2'}}</span>
              </div>
            </div>
          </div>
        </ng-container>
        <ng-template #sinDetalle>
          <p class="rounded-xl bg-system-background p-3 font-body-sm text-on-surface-variant">El detalle de productos no está disponible en este dispositivo para este pedido.</p>
        </ng-template>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p class="flex items-center gap-2 text-sm"><span class="material-symbols-outlined text-[18px] text-primary">{{ grupo(o)==='cancelado' ? 'error' : 'info' }}</span>{{ statusMessage(o) }}</p>
          <div class="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
            <span *ngIf="o.pedidoLogisticoId">Guía <strong class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-on-surface">{{o.pedidoLogisticoId.slice(0,8)}}</strong></span>
            <span *ngIf="esRetiro(o) && o.codigoRetiro && activo(o)" class="rounded-lg bg-green-50 px-3 py-1.5 font-bold text-status-delivered">Código de retiro: <span class="tracking-wider">{{o.codigoRetiro}}</span></span>
          </div>
        </div>

        <div *ngIf="grupo(o)==='pendiente'" class="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-amber-900"><strong>Tu pedido está reservado, pero falta pagarlo.</strong> Confírmalo ahora; si esperas demasiado, la reserva expira y los productos se liberan.</p>
          <div class="flex shrink-0 flex-wrap gap-2">
            <button type="button" class="btn-primary" (click)="pagar(o)" [disabled]="ocupado() === o.ordenId">
              <span *ngIf="ocupado() === o.ordenId" class="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              {{ ocupado() === o.ordenId ? 'Procesando…' : 'Completar pago' }}
            </button>
            <button type="button" class="btn-ghost" (click)="cancelar(o)" [disabled]="ocupado() === o.ordenId">Cancelar pedido</button>
          </div>
        </div>
      </article>
    </div>
  </section>
  `,
})
export class OrdersPage implements OnInit {
  ordenes = signal<OrdenResumen[]>([]);
  loading = signal(false);
  error = signal('');
  tipo = signal<FiltroTipo>('todos');
  estado = signal<FiltroEstado>('todos');
  busqueda = signal('');
  /** Detalle de cada orden (GET /ordenes/{id}/detalle): productos y datos de entrega. */
  detalles = signal<Record<string, OrdenDetalleMia>>({});
  private readonly toast = inject(ToastService);

  readonly estados: { id: FiltroEstado; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'pendiente', label: 'Pago pendiente' },
    { id: 'curso', label: 'En curso' },
    { id: 'completado', label: 'Completados' },
    { id: 'cancelado', label: 'Cancelados' },
  ];
  readonly stepsRetiro = ['Confirmado', 'Preparando', 'Listo para retiro', 'Retirado'];
  readonly stepsDomicilio = ['Pendiente', 'Asignado', 'En camino', 'Entregado'];

  filtradas = computed(() => {
    const t = this.tipo(), e = this.estado();
    return [...this.ordenes()]
      .filter((o) => t === 'todos' || (t === 'retiro') === this.esRetiro(o))
      .filter((o) => e === 'todos' || this.grupo(o) === e)
      .filter((o) => this.coincide(o, this.busqueda()))
      .sort((a, b) => this.fecha(b) - this.fecha(a));
  });

  constructor(private orders: OrderService) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true); this.error.set('');
    this.orders.misOrdenes().subscribe({
      next: (res: any) => {
        const lista: OrdenResumen[] = Array.isArray(res) ? res : (res?.items ?? []);
        this.ordenes.set(lista); this.loading.set(false);
        lista.forEach((o) => this.cargarDetalle(o.ordenId));
      },
      error: (e) => { this.error.set(e?.userMessage || 'No pudimos cargar tus pedidos.'); this.loading.set(false); },
    });
  }

  private cargarDetalle(id: string) {
    this.orders.detalle?.(id)?.subscribe({
      next: (d) => this.detalles.update((m) => ({ ...m, [id]: d })),
      error: () => { /* se usa la copia local si existe */ },
    });
  }

  /** Pedido cuyo pago se está procesando (para bloquear los botones). */
  ocupado = signal<string | null>(null);

  /** Completa el pago de un pedido pendiente: simulado se confirma aquí; PayPal se aprueba en PayPal. */
  pagar(o: OrdenResumen) {
    this.ocupado.set(o.ordenId);
    this.orders.confirmarPago(o.ordenId).subscribe({
      next: () => { this.ocupado.set(null); this.toast.success('¡Pago realizado con éxito! Tu pedido quedó confirmado.'); this.load(); },
      error: (e) => {
        const codigo = e?.code || e?.problem?.codigo;
        if (codigo === 'PAYPAL_CAPTURA_REQUERIDA') { this.capturarOAprobar(o); return; }
        this.ocupado.set(null);
        this.toast.error(e?.userMessage || 'No pudimos confirmar el pago. Inténtalo de nuevo.');
        if (codigo === 'PAGO_NO_CONFIRMABLE') this.load();
      },
    });
  }

  /**
   * Pedido de PayPal: si ya lo aprobaste en PayPal pero no se llegó a cobrar, se cobra ahora;
   * si todavía no lo aprobaste, te llevamos a PayPal para hacerlo.
   */
  private capturarOAprobar(o: OrdenResumen) {
    this.orders.capturarPayPal(o.ordenId).subscribe({
      next: (r) => {
        if (r?.estadoPago === 'Confirmado') {
          borrarPayPalPendiente();
          this.ocupado.set(null);
          this.toast.success('¡Pago realizado con éxito! Tu pedido quedó confirmado.');
          this.load();
        } else this.iniciarPayPal(o);
      },
      error: (e) => {
        const codigo = e?.code || e?.problem?.codigo;
        if (codigo === 'PAYPAL_CAPTURA_NO_CONFIRMADA' || codigo === 'PAYPAL_ORDEN_NO_ENCONTRADA') { this.iniciarPayPal(o); return; }
        this.ocupado.set(null);
        this.toast.error(e?.userMessage || 'No pudimos cobrar el pago con PayPal. Inténtalo de nuevo.');
        this.load();
      },
    });
  }

  private iniciarPayPal(o: OrdenResumen) {
    guardarPayPalPendiente(o.ordenId);
    this.toast.info('Este pedido se paga con PayPal. Te llevamos a PayPal para aprobarlo.');
    this.orders.crearOrdenPayPal(o.ordenId).subscribe({
      next: (r) => {
        if (!r?.urlAprobacion) { this.ocupado.set(null); this.toast.error('PayPal no devolvió el enlace de pago. Inténtalo de nuevo.'); return; }
        guardarPayPalPendiente(o.ordenId, r.payPalOrderId);
        window.location.assign(r.urlAprobacion);
      },
      error: (e) => { this.ocupado.set(null); borrarPayPalPendiente(); this.toast.error(e?.userMessage || 'No pudimos abrir PayPal. Inténtalo de nuevo.'); },
    });
  }

  cancelar(o: OrdenResumen) {
    if (!confirm('¿Cancelar este pedido? Se liberarán los productos reservados y no se te cobrará.')) return;
    this.ocupado.set(o.ordenId);
    this.orders.cancelarPago(o.ordenId).subscribe({
      next: () => { this.ocupado.set(null); this.toast.info('Pedido cancelado. No se realizó ningún cobro.'); this.load(); },
      error: (e) => { this.ocupado.set(null); this.toast.error(e?.userMessage || 'No pudimos cancelar el pedido. Inténtalo de nuevo.'); },
    });
  }

  limpiar() { this.tipo.set('todos'); this.estado.set('todos'); this.busqueda.set(''); }

  /** Pedido en curso más reciente (para mostrarlo arriba con su progreso). */
  destacado = computed(() => [...this.ordenes()].filter((o) => this.grupo(o) === 'curso').sort((a, b) => this.fecha(b) - this.fecha(a))[0] ?? null);
  enCurso = computed(() => this.ordenes().filter((o) => this.grupo(o) === 'curso').length);
  conteoEstado(id: FiltroEstado) { const l = this.ordenes(); return id === 'todos' ? l.length : l.filter((o) => this.grupo(o) === id).length; }
  private coincide(o: OrdenResumen, q: string) {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (o.numeroOrden || o.ordenId || '').toLowerCase().includes(t) || this.lineas(o).some((l) => l.nombre.toLowerCase().includes(t));
  }
  iconoPaso(o: OrdenResumen, i: number) {
    const dom = ['inventory_2', 'badge', 'local_shipping', 'home'], ret = ['task_alt', 'inventory_2', 'storefront', 'shopping_bag'];
    return (this.esRetiro(o) ? ret : dom)[i];
  }
  copiar(texto: string) {
    navigator.clipboard?.writeText(texto).then(() => this.toast.success('Número de orden copiado.'), () => this.toast.error('No se pudo copiar. Cópialo manualmente.'));
  }
  conteoTipo(t: FiltroTipo) {
    const l = this.ordenes();
    return t === 'todos' ? l.length : l.filter((o) => (t === 'retiro') === this.esRetiro(o)).length;
  }

  private fecha(o: OrdenResumen) { return new Date(o.creadaEn || o.fechaCreacion || 0).getTime() || 0; }
  esRetiro(o: OrdenResumen) { return (o.tipoEntrega || '').toLowerCase() === 'retirotienda'; }
  stepsFor(o: OrdenResumen) { return this.esRetiro(o) ? this.stepsRetiro : this.stepsDomicilio; }
  humanizar(v?: string | null) { return v ? v.replace(/([a-z])([A-Z])/g, '$1 $2') : '—'; }

  /** Productos del pedido: los que devuelva la API o la copia guardada al hacer el checkout. */
  lineas(o: OrdenResumen): LineaPedido[] {
    const d = this.detalles()[o.ordenId];
    if (d?.items) {
      const local = this.orders.detalleLocal?.(o.ordenId) ?? [];
      return d.items.map((i) => ({ nombre: i.nombreProducto, cantidad: i.cantidad, precio: i.precioUnitario, subtotal: i.subtotal, imagenUrl: local.find((l) => l.productoId === i.productoId)?.imagenUrl }));
    }
    if (o.items?.length) {
      return o.items.map((i) => {
        const precio = i.precioAplicado ?? i.precioUnitario ?? i.precioOferta ?? i.precioBase ?? 0;
        return { nombre: i.nombre || i.productoId, cantidad: i.cantidad, precio, subtotal: i.subtotal ?? precio * i.cantidad, imagenUrl: i.imagenPrincipalUrl ?? i.imagenUrl };
      });
    }
    const local = this.orders.detalleLocal?.(o.ordenId) ?? [];
    return local.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio, subtotal: i.precio * i.cantidad, imagenUrl: i.imagenUrl }));
  }
  detalleDe(o: OrdenResumen) { return this.detalles()[o.ordenId]; }
  unidades(o: OrdenResumen) { return this.lineas(o).reduce((a, l) => a + l.cantidad, 0); }

  grupo(o: OrdenResumen): FiltroEstado {
    if (/cancelad|fallid|expirad/i.test(`${o.estadoPago} ${o.estadoOrden}`)) return 'cancelado';
    if (/pendiente/i.test(o.estadoPago || '') && !/pagada/i.test(o.estadoOrden || '')) return 'pendiente';
    return this.stepIndex(o) >= 3 ? 'completado' : 'curso';
  }
  activo(o: OrdenResumen) { const g = this.grupo(o); return g !== 'pendiente' && g !== 'cancelado'; }
  etiquetaEstado(o: OrdenResumen) {
    return { cancelado: 'Cancelado', pendiente: 'Pago pendiente', completado: this.esRetiro(o) ? 'Retirado' : 'Entregado', curso: 'En curso', todos: '' }[this.grupo(o)];
  }
  badgeEstado(o: OrdenResumen) {
    return { cancelado: 'badge-red', pendiente: 'badge-orange', completado: 'badge-green', curso: 'badge-soft-blue', todos: '' }[this.grupo(o)];
  }

  stepIndex(o: OrdenResumen): number {
    const s = `${o.estadoSeguimiento || ''} ${o.estadoOrden || ''} ${o.estadoPago || ''}`.toLowerCase();
    if (!this.esRetiro(o)) {
      if (/entregad/.test(s)) return 3;
      if (/camino/.test(s)) return 2;
      if (/asignad/.test(s)) return 1;
      return 0;
    }
    if (/entregado|retirado|completad/.test(s)) return 3;
    if (/camino|encamino/.test(s)) return 2;
    if (/listo/.test(s)) return 2;
    if (/prepar|asignad|pagada|confirmado/.test(s)) return 1;
    return 0;
  }

  statusMessage(o: OrdenResumen): string {
    const g = this.grupo(o);
    if (g === 'pendiente') return 'Pago pendiente: aún no se confirma tu pago.';
    if (g === 'cancelado') return 'El pago no se completó.';
    const i = this.stepIndex(o);
    if (this.esRetiro(o)) {
      return ['¡Pedido confirmado! Te avisaremos cuando esté listo.', '¡Listo! Tu pedido está en preparación.', 'Tu pedido está listo para retiro en tienda.', 'Pedido retirado. ¡Gracias por tu compra!'][i];
    }
    return ['Pedido recibido. Está pendiente de asignación a un repartidor.', 'Tu pedido fue asignado a un repartidor.', 'Tu pedido va en camino.', 'Pedido entregado. ¡Gracias por tu compra!'][i];
  }
}
