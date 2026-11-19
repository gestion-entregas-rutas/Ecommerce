import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../core/services/order.service';
import { OrdenDetalleMia, OrdenResumen } from '../../core/models/api.models';

type FiltroTipo = 'todos' | 'domicilio' | 'retiro';
type FiltroEstado = 'todos' | 'pendiente' | 'curso' | 'completado' | 'cancelado';

interface LineaPedido { nombre: string; cantidad: number; precio: number; subtotal: number; imagenUrl?: string | null; }

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <section class="fade-in">
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-headline-md">Mis pedidos</h1>
        <p class="font-body-sm text-on-surface-variant mt-1">Revisa qué compraste y cómo va cada entrega o retiro.</p>
      </div>
      <button class="btn-ghost !py-2" (click)="load()" [disabled]="loading()"><span class="material-symbols-outlined text-[18px]">refresh</span>Actualizar</button>
    </div>

    <!-- Resumen / filtro por modalidad -->
    <div class="mb-5 grid grid-cols-3 gap-3">
      <button type="button" (click)="tipo.set('todos')" class="surface-card p-4 text-left transition" [class.ring-2]="tipo()==='todos'" [class.ring-primary]="tipo()==='todos'">
        <div class="font-caption text-on-surface-variant">Todos</div>
        <div class="font-headline-md tabular-nums">{{conteoTipo('todos')}}</div>
      </button>
      <button type="button" (click)="tipo.set('domicilio')" class="surface-card p-4 text-left transition" [class.ring-2]="tipo()==='domicilio'" [class.ring-primary]="tipo()==='domicilio'">
        <div class="font-caption text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">local_shipping</span>A domicilio</div>
        <div class="font-headline-md tabular-nums">{{conteoTipo('domicilio')}}</div>
      </button>
      <button type="button" (click)="tipo.set('retiro')" class="surface-card p-4 text-left transition" [class.ring-2]="tipo()==='retiro'" [class.ring-primary]="tipo()==='retiro'">
        <div class="font-caption text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">storefront</span>Retiro en tienda</div>
        <div class="font-headline-md tabular-nums">{{conteoTipo('retiro')}}</div>
      </button>
    </div>

    <!-- Filtro por estado -->
    <div class="mb-5 flex flex-wrap items-center gap-2">
      <span class="font-label-md text-on-surface-variant mr-1">Estado:</span>
      <button *ngFor="let f of estados" type="button" class="chip cursor-pointer" [ngClass]="estado()===f.id ? 'badge-soft-blue !font-semibold' : 'bg-surface-container-low text-on-surface-variant'" (click)="estado.set(f.id)">{{f.label}}</button>
    </div>

    <div *ngIf="loading()" class="surface-card p-8 text-center text-on-surface-variant">Cargando pedidos...</div>
    <div *ngIf="error()" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-body-sm text-red-700">{{error()}}</div>

    <div *ngIf="!loading() && ordenes().length===0" class="surface-card p-10 text-center">
      <p class="font-title-md">Aún no tienes pedidos</p>
      <p class="font-body-sm text-on-surface-variant mt-1">Cuando realices una compra podrás seguirla aquí.</p>
      <a routerLink="/productos" class="btn-primary mt-4 inline-block">Ver productos</a>
    </div>
    <div *ngIf="!loading() && ordenes().length>0 && filtradas().length===0" class="surface-card p-10 text-center">
      <p class="font-title-md">No hay pedidos con estos filtros</p>
      <button class="btn-ghost mt-3" (click)="limpiar()">Quitar filtros</button>
    </div>

    <div class="space-y-4">
      <article *ngFor="let o of filtradas()" class="surface-card overflow-hidden">
        <div class="h-1" [ngClass]="esRetiro(o) ? 'bg-status-delivered' : 'bg-primary'"></div>
        <div class="p-5 sm:p-6">
          <!-- Cabecera -->
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" [ngClass]="esRetiro(o) ? 'badge-green' : 'badge-soft-blue'">
                <span class="material-symbols-outlined">{{esRetiro(o) ? 'storefront' : 'local_shipping'}}</span>
              </div>
              <div>
                <div class="font-title-md">{{o.numeroOrden || o.ordenId}}</div>
                <div class="font-body-sm text-on-surface-variant">{{(o.creadaEn || o.fechaCreacion) | date:'dd MMM yyyy, HH:mm'}}</div>
                <div class="mt-2 flex flex-wrap gap-2">
                  <span class="chip" [ngClass]="esRetiro(o) ? 'badge-green' : 'badge-soft-blue'">{{esRetiro(o) ? 'Retiro en tienda' : 'Entrega a domicilio'}}</span>
                  <span class="chip" [ngClass]="badgeEstado(o)">{{etiquetaEstado(o)}}</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-caption text-on-surface-variant">Total</div>
              <div class="font-headline-md tabular-nums">\${{(o.total ?? 0) | number:'1.2-2'}}</div>
            </div>
          </div>

          <!-- Productos -->
          <div class="mt-5 rounded-xl border border-separator-hairline-light">
            <div class="px-4 py-2 font-label-md border-b border-separator-hairline-light flex items-center gap-1">
              <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
              Productos del pedido
              <span *ngIf="lineas(o).length" class="text-on-surface-variant font-normal">({{unidades(o)}} {{unidades(o)===1 ? 'unidad' : 'unidades'}})</span>
            </div>
            <ng-container *ngIf="lineas(o).length; else sinDetalle">
              <div *ngFor="let l of lineas(o)" class="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-separator-hairline-light">
                <div class="h-12 w-12 shrink-0 rounded-lg bg-surface-container-low flex items-center justify-center overflow-hidden p-1">
                  <img *ngIf="l.imagenUrl" [src]="l.imagenUrl" [alt]="l.nombre" class="max-h-full max-w-full object-contain" />
                  <span *ngIf="!l.imagenUrl" class="material-symbols-outlined text-on-surface-variant">inventory_2</span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="font-body-sm font-medium truncate">{{l.nombre}}</div>
                  <div class="font-caption text-on-surface-variant tabular-nums">{{l.cantidad}} × \${{l.precio | number:'1.2-2'}}</div>
                </div>
                <div class="font-label-md tabular-nums">\${{l.subtotal | number:'1.2-2'}}</div>
              </div>
            </ng-container>
            <ng-template #sinDetalle>
              <div class="px-4 py-3 font-body-sm text-on-surface-variant">El detalle de productos no está disponible en este dispositivo para este pedido.</div>
            </ng-template>
          </div>

          <!-- Seguimiento -->
          <div class="mt-6">
            <div class="flex items-center justify-between mb-2">
              <ng-container *ngFor="let s of stepsFor(o); let i=index; let last=last">
                <div class="flex flex-col items-center gap-1 flex-1">
                  <div class="h-2.5 w-2.5 rounded-full" [ngClass]="activo(o) && i <= stepIndex(o) ? 'bg-primary' : 'bg-separator-hairline-light'"></div>
                  <span class="font-caption text-on-surface-variant text-center" [class.!text-primary]="activo(o) && i <= stepIndex(o)">{{s}}</span>
                </div>
                <div *ngIf="!last" class="h-[2px] flex-1 -mt-5" [ngClass]="activo(o) && i < stepIndex(o) ? 'bg-primary' : 'bg-separator-hairline-light'"></div>
              </ng-container>
            </div>
            <p class="font-body-sm mt-2">{{ statusMessage(o) }}</p>
          </div>

          <!-- Datos -->
          <div class="mt-4 grid gap-2 font-body-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><span class="text-on-surface-variant">Orden:</span> {{humanizar(o.estadoOrden)}}</div>
            <div><span class="text-on-surface-variant">Pago:</span> {{humanizar(o.estadoPago)}}</div>
            <div><span class="text-on-surface-variant">{{esRetiro(o) ? 'Retiro:' : 'Envío:'}}</span> {{humanizar(o.estadoSeguimiento)}}</div>
            <div *ngIf="o.pedidoLogisticoId"><span class="text-on-surface-variant">Guía:</span> <span class="tabular-nums">{{o.pedidoLogisticoId.slice(0,8)}}</span></div>
          </div>
          <div *ngIf="detalleDe(o) as d" class="mt-3 rounded-xl surface-subtle p-3 font-body-sm grid gap-1 sm:grid-cols-2">
            <ng-container *ngIf="esRetiro(o); else entregaDomicilio">
              <div *ngIf="d.fechaRetiro"><span class="text-on-surface-variant">Fecha de retiro:</span> {{d.fechaRetiro | date:'dd MMM yyyy'}}</div>
              <div *ngIf="d.franjaHoraria"><span class="text-on-surface-variant">Franja horaria:</span> {{d.franjaHoraria}}</div>
            </ng-container>
            <ng-template #entregaDomicilio>
              <div *ngIf="d.direccionEntrega" class="sm:col-span-2"><span class="text-on-surface-variant">Dirección de entrega:</span> {{d.direccionEntrega}}</div>
              <div *ngIf="d.fechaEntrega"><span class="text-on-surface-variant">Fecha de entrega:</span> {{d.fechaEntrega | date:'dd MMM yyyy'}}</div>
              <div *ngIf="d.horaEntrega"><span class="text-on-surface-variant">Hora:</span> {{d.horaEntrega.slice(0,5)}}</div>
            </ng-template>
          </div>
          <div *ngIf="esRetiro(o) && o.codigoRetiro && activo(o)" class="mt-4 rounded-xl badge-green p-3 flex items-center justify-between gap-3">
            <span class="font-body-sm">Presenta este código en tienda</span>
            <strong class="font-title-md tracking-wider">{{o.codigoRetiro}}</strong>
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
  detalles = signal<Record<string, OrdenDetalleMia>>({});

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

  /** GET /ordenes/{id}/detalle: productos y datos de entrega de cada orden. */
  private cargarDetalle(id: string) {
    this.orders.detalle?.(id)?.subscribe({
      next: (d) => this.detalles.update((m) => ({ ...m, [id]: d })),
      error: () => { /* se usa la copia local si existe */ },
    });
  }

  limpiar() { this.tipo.set('todos'); this.estado.set('todos'); }
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
