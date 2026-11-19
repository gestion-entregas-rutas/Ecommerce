import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { OrdenDetalleMia, OrdenItemSnapshot, CheckoutRequest, CheckoutResponse, OrdenResumen, PayPalOrdenResponse } from '../models/api.models';

function idempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private http: HttpClient) {}

  checkout(payload: CheckoutRequest, key?: string) {
    const headers = new HttpHeaders({ 'Idempotency-Key': key || idempotencyKey('checkout') });
    return this.http.post<CheckoutResponse>(`${environment.apiBaseUrl}/ordenes/checkout`, payload, { headers });
  }

  confirmarPago(id: string, key?: string) {
    const headers = new HttpHeaders({ 'Idempotency-Key': key || idempotencyKey('pago') });
    return this.http.post<CheckoutResponse | OrdenResumen>(`${environment.apiBaseUrl}/ordenes/${id}/pago/confirmar`, {}, { headers });
  }

  cancelarPago(id: string, key?: string) {
    const headers = new HttpHeaders({ 'Idempotency-Key': key || idempotencyKey('cancel') });
    return this.http.post<CheckoutResponse | OrdenResumen>(`${environment.apiBaseUrl}/ordenes/${id}/pago/cancelar`, {}, { headers });
  }

  crearOrdenPayPal(id: string) {
    return this.http.post<PayPalOrdenResponse>(`${environment.apiBaseUrl}/ordenes/${id}/paypal/orden`, {});
  }

  capturarPayPal(id: string) {
    return this.http.post<CheckoutResponse>(`${environment.apiBaseUrl}/ordenes/${id}/paypal/captura`, {});
  }

  // El backend (GET /ordenes/mias) no devuelve los artículos de cada orden: se guarda una copia local al crear el checkout.
  private readonly detalleKey = 'tienda.orderItems.v1';

  guardarDetalle(ordenId: string, items: OrdenItemSnapshot[]) {
    try {
      const all = JSON.parse(localStorage.getItem(this.detalleKey) || '{}');
      all[ordenId] = items;
      localStorage.setItem(this.detalleKey, JSON.stringify(all));
    } catch { /* almacenamiento no disponible */ }
  }

  detalleLocal(ordenId: string): OrdenItemSnapshot[] | null {
    try {
      return JSON.parse(localStorage.getItem(this.detalleKey) || '{}')[ordenId] ?? null;
    } catch { return null; }
  }

  detalle(id: string) {
    return this.http.get<OrdenDetalleMia>(`${environment.apiBaseUrl}/ordenes/${id}/detalle`);
  }

  misOrdenes() {
    return this.http.get<OrdenResumen[] | { items: OrdenResumen[] }>(`${environment.apiBaseUrl}/ordenes/mias`);
  }
}
