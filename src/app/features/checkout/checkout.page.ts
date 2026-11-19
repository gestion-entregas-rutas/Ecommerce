import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { CartService } from '../../core/services/cart.service';
import { CatalogService } from '../../core/services/catalog.service';
import { OrderService } from '../../core/services/order.service';
import { CheckoutResponse } from '../../core/models/api.models';

function pointInPolygon(lat: number, lng: number, poly: { latitud: number; longitud: number }[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].longitud, yi = poly[i].latitud;
    const xj = poly[j].longitud, yj = poly[j].latitud;
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <section class="fade-in">
    <div class="mb-6">
      <h1 class="font-headline-md">Checkout</h1>
      <p class="font-body-sm text-on-surface-variant mt-1">Entrega, pago y confirmación en un solo paso con información clara.</p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div class="space-y-5">
        <div class="surface-card p-6">
          <h2 class="font-title-md">1. Modalidad de entrega</h2>
          <p class="font-body-sm text-on-surface-variant mt-1">Elige envío a domicilio o retiro gratis en tienda.</p>
          <div class="segmented-ios mt-4 grid grid-cols-2 max-w-md">
            <button type="button" [class.active]="tipoEntrega==='Domicilio'" (click)="setTipo('Domicilio')">Envío a domicilio</button>
            <button type="button" [class.active]="tipoEntrega==='RetiroTienda'" (click)="setTipo('RetiroTienda')">Retiro en tienda</button>
          </div>

          <form *ngIf="tipoEntrega==='RetiroTienda'" class="mt-5 grid gap-3 sm:grid-cols-2">
            <input class="input-field sm:col-span-2" [(ngModel)]="retiro.nombreQuienRetira" name="rnombre" placeholder="Nombre de quien retira" required>
            <input class="input-field" [(ngModel)]="retiro.cedulaQuienRetira" name="rcedula" placeholder="Cédula de quien retira" required>
            <input class="input-field" [(ngModel)]="retiro.telefonoContacto" name="rtel" placeholder="Teléfono de contacto" required>
            <input class="input-field" type="date" [(ngModel)]="retiro.fechaRetiro" name="rfecha" required>
            <input class="input-field" [(ngModel)]="retiro.franjaHoraria" name="rfranja" placeholder="Franja horaria (ej. 10:00 - 12:00)" required>
            <div class="sm:col-span-2 surface-subtle p-3 font-body-sm text-on-surface-variant"><span class="text-status-delivered font-label-md">Retiro gratis disponible hoy en nuestro local.</span> Universidad Técnica de Ambato / Hub Metropolitano.</div>
          </form>

          <div *ngIf="tipoEntrega==='Domicilio'" class="mt-5 space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <input class="input-field" [(ngModel)]="domicilio.destinatarioNombre" name="dnombre" placeholder="Nombre del destinatario" required>
              <input class="input-field" [(ngModel)]="domicilio.destinatarioTelefono" name="dtel" placeholder="Teléfono" required>
              <input class="input-field sm:col-span-2" [(ngModel)]="domicilio.direccionTexto" name="ddir" placeholder="Dirección o referencia" required>
              <input class="input-field" type="date" [(ngModel)]="domicilio.fechaEntrega" name="dfecha" required>
              <input class="input-field" type="time" [(ngModel)]="domicilio.horaEntrega" name="dhora" required>
              <textarea class="input-field sm:col-span-2" rows="2" [(ngModel)]="domicilio.observaciones" name="dobs" placeholder="Observaciones (opcional)"></textarea>
            </div>
            <div>
              <div class="font-label-md mb-1">Ubicación y cobertura</div>
              <p class="font-body-sm text-on-surface-variant mb-2">Selecciona tu punto en el mapa para validar si tu dirección está dentro de la zona de cobertura.</p>
              <div #mapEl class="h-72 w-full overflow-hidden rounded-xl border border-separator-hairline-light"></div>
              <div class="mt-2 font-body-sm text-on-surface-variant tabular-nums">Lat: {{domicilio.latitud ?? '—'}} · Lng: {{domicilio.longitud ?? '—'}}</div>
              <div *ngIf="coberturaMsg" class="mt-2 font-body-sm rounded-lg px-3 py-2" [ngClass]="coberturaOk ? 'badge-green' : 'badge-red'">{{coberturaMsg}}</div>
            </div>
          </div>
        </div>

        <div class="surface-card p-6">
          <h2 class="font-title-md">2. Pago</h2>
          <p class="font-body-sm text-on-surface-variant mt-1">Pago simulado para completar tu pedido.</p>
          <div class="segmented-ios mt-4 inline-flex">
            <button type="button" [class.active]="pago.tipo==='Tarjeta'" (click)="pago.tipo='Tarjeta'">Tarjeta</button>
            <button type="button" [class.active]="pago.tipo==='Transferencia'" (click)="pago.tipo='Transferencia'">Transferencia</button>
          </div>
          <div *ngIf="pago.tipo==='Tarjeta'" class="mt-4 grid gap-3 sm:grid-cols-2">
            <input class="input-field sm:col-span-2" [(ngModel)]="pago.titular" name="ptitular" placeholder="Titular de la tarjeta">
            <input class="input-field sm:col-span-2" [(ngModel)]="card.numero" name="pcard" placeholder="Número de tarjeta (simulado)" maxlength="19" (input)="formatCard()">
            <input class="input-field" [(ngModel)]="card.exp" name="pexp" placeholder="MM/AA" maxlength="5">
            <input class="input-field" [(ngModel)]="card.cvv" name="pcvv" placeholder="CVV" maxlength="4">
            <div *ngIf="cardError" class="font-body-sm text-status-urgent sm:col-span-2">{{cardError}}</div>
          </div>
          <div *ngIf="pago.tipo==='Transferencia'" class="mt-4 font-body-sm text-on-surface-variant">Se generará una referencia simulada para confirmar tu pedido.</div>
        </div>

        <div *ngIf="error" class="rounded-xl border border-red-200 bg-red-50 p-4 font-body-sm text-red-700 whitespace-pre-line">{{error}}</div>

        <div *ngIf="success" class="surface-card p-6 border border-green-200">
          <h3 class="font-title-md text-status-delivered">¡Pedido confirmado!</h3>
          <p class="font-body-sm text-on-surface-variant mt-1">Te avisaremos cuando salga a ruta.</p>
          <div class="mt-4 grid gap-1 font-body-sm">
            <div><span class="text-on-surface-variant">Número:</span> <strong>{{success.numeroOrden || success.ordenId}}</strong></div>
            <div><span class="text-on-surface-variant">Estado:</span> {{success.estadoOrden || 'Pendiente de pago'}} · <span class="text-on-surface-variant">Total:</span> <span class="tabular-nums">\${{(success.totalPagado ?? success.total ?? 0) | number:'1.2-2'}}</span></div>
            <div *ngIf="success.referenciaPago"><span class="text-on-surface-variant">Referencia:</span> {{success.referenciaPago}}</div>
            <div *ngIf="success.codigoRetiro"><span class="text-on-surface-variant">Código de retiro:</span> <strong>{{success.codigoRetiro}}</strong></div>
            <div *ngIf="success.pedidoLogisticoId"><span class="text-on-surface-variant">Seguimiento:</span> {{success.pedidoLogisticoId}} ({{success.estadoSeguimiento || 'Pendiente'}})</div>
            <div *ngIf="success.expiraEn"><span class="text-on-surface-variant">Expira:</span> {{success.expiraEn | date:'medium'}} <span *ngIf="remainingSec>0" class="tabular-nums">(restan {{remainingSec}}s)</span><span *ngIf="remainingSec<=0" class="text-status-urgent font-semibold"> (expirada)</span></div>
          </div>

          <div class="mt-5">
            <div class="flex items-center justify-between mb-2">
              <ng-container *ngFor="let s of ['Confirmado','Preparando','En camino','Entregado']; let i=index; let last=last">
                <div class="flex flex-col items-center gap-1 flex-1">
                  <div class="h-2.5 w-2.5 rounded-full" [ngClass]="i <= progressStep() ? 'bg-primary' : 'bg-separator-hairline-light'"></div>
                  <span class="font-caption text-on-surface-variant text-center">{{s}}</span>
                </div>
                <div *ngIf="!last" class="h-[2px] flex-1 -mt-5" [ngClass]="i < progressStep() ? 'bg-primary' : 'bg-separator-hairline-light'"></div>
              </ng-container>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap gap-2" *ngIf="!confirmed && !cancelled">
            <button class="btn-primary" (click)="confirmarPago()" [disabled]="processing">{{processing?'Procesando...':'Confirmar pago'}}</button>
            <button class="btn-ghost" (click)="cancelarPago()" [disabled]="processing">Cancelar</button>
          </div>
          <div *ngIf="confirmed" class="mt-3 font-body-sm text-status-delivered font-medium">Pago confirmado. Tu pedido avanza al siguiente paso.</div>
          <div *ngIf="cancelled" class="mt-3 font-body-sm text-status-in-transit font-medium">Pago cancelado.</div>
          <button class="btn-secondary-soft mt-4" (click)="goOrders()" *ngIf="success">Ver mis pedidos</button>
        </div>

        <div class="flex flex-wrap gap-3" *ngIf="!success">
          <button class="btn-primary !py-3 !px-6" (click)="submit()" [disabled]="processing || cart.items().length===0">Confirmar y pagar</button>
          <button class="btn-ghost !py-3" (click)="refreshQuote()">Actualizar totales</button>
        </div>
      </div>

      <aside class="surface-card h-fit p-6 lg:sticky lg:top-20">
        <h2 class="font-title-md">Resumen</h2>
        <p class="font-body-sm text-on-surface-variant mt-1">Desglose claro antes de confirmar.</p>
        <div class="mt-4 space-y-3 font-body-sm">
          <div *ngFor="let i of cart.items()" class="flex justify-between gap-3">
            <span class="text-on-surface-variant">{{i.nombre || i.productoId}} × {{i.cantidad}}</span>
            <span class="tabular-nums">\${{((i.subtotal ?? ((i.precioUnitario ?? i.precioOferta ?? i.precioBase ?? 0)*i.cantidad))) | number:'1.2-2'}}</span>
          </div>
        </div>
        <div class="mt-4 pt-4 border-t border-separator-hairline-light space-y-2 font-body-sm">
          <div class="flex justify-between"><span class="text-on-surface-variant">Subtotal</span><span class="tabular-nums">\${{cart.subtotal() | number:'1.2-2'}}</span></div>
          <div class="flex justify-between"><span class="text-on-surface-variant">Envío</span><span [class.text-status-delivered]="tipoEntrega==='RetiroTienda'">{{ tipoEntrega==='RetiroTienda' ? 'Gratis (retiro)' : 'Según cobertura' }}</span></div>
        </div>
        <div class="mt-3 flex justify-between items-baseline"><span class="font-title-md">Total</span><span class="font-headline-md tabular-nums">\${{cart.subtotal() | number:'1.2-2'}}</span></div>
        <div *ngIf="cart.cart()?.requiereRevision" class="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 font-body-sm text-amber-900">Hay cambios en tu carrito. Actualiza los totales antes de pagar.</div>
      </aside>
    </div>
  </section>
  `,
})
export class CheckoutPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;
  tipoEntrega: 'RetiroTienda' | 'Domicilio' = 'Domicilio';
  retiro = { cedulaQuienRetira: '', nombreQuienRetira: '', telefonoContacto: '', fechaRetiro: '', franjaHoraria: '' };
  domicilio = { destinatarioNombre: '', destinatarioTelefono: '', direccionTexto: '', latitud: null as number | null, longitud: null as number | null, fechaEntrega: '', horaEntrega: '', observaciones: '' };
  pago: any = { tipo: 'Tarjeta', titular: '', ultimos4: '', referenciaSimulada: '' };
  card = { numero: '', exp: '', cvv: '' }; cardError = '';
  zonas: any[] = []; coberturaMsg = ''; coberturaOk = false;
  map?: L.Map; marker?: L.Marker; polygons: L.Polygon[] = [];
  error = ''; success?: CheckoutResponse; processing = false; confirmed = false; cancelled = false;
  checkoutKey = `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  confirmKey = `confirm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  cancelKey = `cancel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  remainingSec = 0; timer?: any;

  constructor(public cart: CartService, private catalog: CatalogService, private orders: OrderService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    const entrega = this.route.snapshot.queryParamMap.get('entrega');
    if (entrega === 'RetiroTienda' || entrega === 'Domicilio') this.tipoEntrega = entrega;
    this.cart.cotizacion().subscribe({ error: () => this.cart.load().subscribe({ error: () => {} }) });
    this.catalog.getZonas().subscribe({ next: (z) => { this.zonas = z || []; this.drawZones(); }, error: () => {} });
  }
  ngAfterViewInit() { if (this.tipoEntrega === 'Domicilio') setTimeout(() => this.initMap(), 0); }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); this.map?.remove(); }

  setTipo(t: 'RetiroTienda' | 'Domicilio') { this.tipoEntrega = t; this.onTipoChange(); }
  onTipoChange() { if (this.tipoEntrega === 'Domicilio') setTimeout(() => this.initMap(), 0); }
  refreshQuote() { this.cart.cotizacion().subscribe({ next: () => {}, error: () => this.cart.load().subscribe({ error: () => {} }) }); }

  initMap() {
    if (this.map || !this.mapEl) return;
    this.map = L.map(this.mapEl.nativeElement).setView([-1.2416, -78.6197], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(this.map);
    this.map.on('click', (e: any) => this.setPoint(e.latlng.lat, e.latlng.lng));
    this.drawZones();
    setTimeout(() => this.map?.invalidateSize(), 100);
  }
  drawZones() {
    if (!this.map) return;
    this.polygons.forEach(p => p.remove()); this.polygons = [];
    this.zonas.filter(z => z?.activa !== false).forEach((z) => {
      const pts = (z.poligono || z.coordenadas || []).map((p: any) => [p.latitud ?? p.lat ?? p.latitude, p.longitud ?? p.lng ?? p.lon ?? p.longitude]);
      if (pts.length >= 3) this.polygons.push(L.polygon(pts as any, { color: '#6A1B9A', weight: 1, fillOpacity: 0.08 }).addTo(this.map!));
    });
  }
  setPoint(lat: number, lng: number) {
    this.domicilio.latitud = +lat.toFixed(6); this.domicilio.longitud = +lng.toFixed(6);
    if (!this.map) return;
    if (!this.marker) this.marker = L.marker([lat, lng]).addTo(this.map); else this.marker.setLatLng([lat, lng]);
    this.validateCoverage();
  }
  validateCoverage() {
    const lat = this.domicilio.latitud, lng = this.domicilio.longitud;
    if (lat == null || lng == null) { this.coberturaOk = false; this.coberturaMsg = 'Selecciona un punto en el mapa para validar tu dirección.'; return false; }
    const active = this.zonas.filter(z => z?.activa !== false);
    if (active.length === 0) { this.coberturaOk = true; this.coberturaMsg = 'Validaremos la cobertura de tu dirección al confirmar el pedido.'; return true; }
    const ok = active.some((z) => {
      const poly = (z.poligono || z.coordenadas || []).map((p: any) => ({ latitud: p.latitud ?? p.lat ?? p.latitude, longitud: p.longitud ?? p.lng ?? p.lon ?? p.longitude }));
      return poly.length >= 3 && pointInPolygon(lat, lng, poly);
    });
    this.coberturaOk = ok;
    this.coberturaMsg = ok ? 'Disponible para envío hoy a tu zona.' : 'Por ahora no llegamos a ese punto. Prueba con otra ubicación dentro de la zona de cobertura.';
    return ok;
  }

  formatCard() { this.card.numero = this.card.numero.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim(); }
  validateCard(): boolean {
    if (this.pago.tipo !== 'Tarjeta') return true;
    const digits = this.card.numero.replace(/\s+/g,'');
    if (digits.length < 12 || !/^\d{2}\/\d{2}$/.test(this.card.exp) || !/^\d{3,4}$/.test(this.card.cvv)) {
      this.cardError = 'Revisa los datos de la tarjeta (número, MM/AA y CVV) para continuar.'; return false;
    }
    this.cardError = ''; this.pago.ultimos4 = digits.slice(-4); this.pago.referenciaSimulada = 'PAY-' + Math.floor(Math.random()*900000+100000);
    return true;
  }

  submit() {
    this.error = '';
    if (this.cart.cart()?.requiereRevision) { this.error = 'Detectamos cambios en tu bolsa. Actualiza los totales antes de pagar.'; return; }
    if (this.tipoEntrega === 'Domicilio' && !this.validateCoverage()) { this.error = this.coberturaMsg; return; }
    if (!this.validateCard()) return;
    const items = this.cart.items().map(i => ({ productoId: i.productoId, cantidad: i.cantidad }));
    const payload: any = { items, tipoEntrega: this.tipoEntrega, metodoPago: this.pago, datosRetiroTienda: null, datosDomicilio: null };
    if (this.tipoEntrega === 'RetiroTienda') payload.datosRetiroTienda = this.retiro;
    else payload.datosDomicilio = { ...this.domicilio, horaEntrega: this.domicilio.horaEntrega?.length === 5 ? this.domicilio.horaEntrega + ':00' : this.domicilio.horaEntrega };

    this.processing = true;
    this.orders.checkout(payload, this.checkoutKey).subscribe({
      next: (res) => { this.success = res; this.processing = false; this.startExpiryTimer(res.expiraEn); this.cart.clearLocal(); },
      error: (e) => {
        this.processing = false;
        const code = e?.code || e?.problem?.codigo;
        if (e?.status === 409 && code === 'STOCK_AGOTADO') {
          const p = e?.problem;
          this.error = `Lo sentimos, ${p?.mensaje || 'un artículo de tu bolsa acaba de agotarse o cambió su disponibilidad.'}${p?.stockDisponible != null ? ` (disponible: ${p.stockDisponible})` : ''} Actualizamos tu bolsa para que puedas continuar.`;
          this.cart.cotizacion().subscribe({ error: () => this.cart.load().subscribe({ error: () => {} }) });
        } else if (e?.status === 422) {
          this.error = e?.userMessage || 'No podemos entregar en esa dirección. Prueba seleccionando otro punto dentro de la zona de cobertura.';
        } else if (e?.status === 409 && code === 'PAGO_NO_CONFIRMABLE') {
          this.error = 'La reserva de tu pedido expiró o ya no es confirmable. Te invitamos a iniciar un nuevo checkout.';
        } else {
          this.error = e?.userMessage || 'No pudimos procesar tu pedido en este momento. Inténtalo nuevamente.';
        }
      },
    });
  }

  confirmarPago() {
    if (!this.success?.ordenId) return;
    this.processing = true;
    this.orders.confirmarPago(this.success.ordenId, this.confirmKey).subscribe({
      next: (res: any) => { this.processing = false; this.confirmed = true; this.success = { ...this.success!, ...res }; },
      error: (e) => {
        this.processing = false;
        const code = e?.code || e?.problem?.codigo;
        this.error = code === 'PAGO_NO_CONFIRMABLE' ? 'La reserva expiró o fue liberada. Por favor, realiza un nuevo checkout.' : (e?.userMessage || 'No pudimos confirmar el pago. Inténtalo nuevamente.');
      },
    });
  }
  cancelarPago() {
    if (!this.success?.ordenId) return;
    this.processing = true;
    this.orders.cancelarPago(this.success.ordenId, this.cancelKey).subscribe({
      next: (res: any) => { this.processing = false; this.cancelled = true; this.success = { ...this.success!, ...res }; },
      error: (e) => { this.processing = false; this.error = e?.userMessage || 'No pudimos cancelar el pago en este momento.'; },
    });
  }

  progressStep() { return this.confirmed ? 1 : 0; }
  startExpiryTimer(expiraEn?: string) {
    if (!expiraEn) return;
    const end = new Date(expiraEn).getTime();
    const tick = () => { this.remainingSec = Math.max(0, Math.floor((end - Date.now()) / 1000)); };
    tick(); this.timer = setInterval(tick, 1000);
  }
  goOrders() { this.router.navigateByUrl('/mis-pedidos'); }
}
