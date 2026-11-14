import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CheckoutRequest, CheckoutResponse, OrdenResumen } from '../models/api.models';

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

  misOrdenes() {
    return this.http.get<OrdenResumen[] | { items: OrdenResumen[] }>(`${environment.apiBaseUrl}/ordenes/mias`);
  }
}
