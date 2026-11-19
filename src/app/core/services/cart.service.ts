import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Carrito, CarritoItem } from '../models/api.models';
import { CartTokenService } from './cart-token.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly cartSignal = signal<Carrito | null>(null);
  readonly cart = this.cartSignal.asReadonly();
  readonly items = computed(() => this.cartSignal()?.items ?? []);
  readonly count = computed(() => this.items().reduce((acc, i) => acc + (i.cantidad || 0), 0));
  readonly subtotal = computed(() => {
    const c = this.cartSignal();
    if (c?.subtotal != null) return c.subtotal;
    return this.items().reduce((acc, i) => acc + (i.subtotal ?? (i.precioAplicado ?? i.precioUnitario ?? i.precioOferta ?? i.precioBase ?? 0) * i.cantidad), 0);
  });

  constructor(
    private http: HttpClient,
    private cartTokenService: CartTokenService,
    private storage: StorageService,
  ) {
    const local = this.storage.get<Carrito>(environment.cartStorageKey);
    if (local) this.cartSignal.set(local);
  }

  load() {
    return this.http.get<Carrito>(`${environment.apiBaseUrl}/carrito`).pipe(
      timeout(12000),
      tap((cart) => this.setCart(cart)),
    );
  }

  addItem(productoId: string, cantidad = 1) {
    return this.http.post<Carrito>(`${environment.apiBaseUrl}/carrito/items`, { productoId, cantidad }).pipe(
      tap((cart) => this.setCart(cart)),
    );
  }

  updateItem(productoId: string, cantidad: number) {
    return this.http.put<Carrito>(`${environment.apiBaseUrl}/carrito/items/${productoId}`, { cantidad }).pipe(
      tap((cart) => this.setCart(cart)),
    );
  }

  removeItem(productoId: string) {
    return this.http.delete<Carrito>(`${environment.apiBaseUrl}/carrito/items/${productoId}`).pipe(
      tap((cart) => this.setCart(cart)),
    );
  }

  mergeGuestCart() {
    const tokenInvitado = this.cartTokenService.get();
    if (!tokenInvitado) return this.load();
    return this.http.post<Carrito>(`${environment.apiBaseUrl}/carrito/merge`, { tokenInvitado }).pipe(
      tap((cart) => this.setCart(cart)),
    );
  }

  cotizacion() {
    // /carrito/cotizacion devuelve CotizacionDto (otra forma que CarritoDto): se combina con el carrito actual.
    return this.http.get<any>(`${environment.apiBaseUrl}/carrito/cotizacion`).pipe(
      tap((q) => {
        const actual = this.cartSignal();
        const porId = new Map<string, any>((q?.items ?? []).map((i: any) => [i.productoId, i]));
        const items = (actual?.items ?? [])
          .map((i) => {
            const c = porId.get(i.productoId);
            if (!c) return i;
            return { ...i, cantidad: c.cantidadFinal ?? i.cantidad, precioAplicado: c.precioUnitario ?? i.precioAplicado, subtotal: c.subtotal ?? i.subtotal, disponible: c.disponible ?? i.disponible, advertencia: c.advertencia ?? null };
          })
          .filter((i) => i.cantidad > 0);
        this.setCart({
          ...(actual ?? { items: [] }),
          items,
          subtotal: q?.subtotal, descuento: q?.descuento, envio: q?.envio, total: q?.total,
          requiereRevision: !!q?.requiereRevision, advertencias: q?.advertencias ?? [],
        });
      }),
    );
  }

  setCart(cart: Carrito | null) {
    this.cartSignal.set(cart);
    if (cart) {
      this.storage.set(environment.cartStorageKey, cart);
      this.cartTokenService.set(cart.tokenInvitado ?? cart.cartToken);
    } else {
      this.storage.remove(environment.cartStorageKey);
    }
  }

  clearLocal() {
    this.setCart(null);
    this.cartTokenService.clear();
  }

  localQuantityFor(productoId: string): number {
    return this.items().find((i) => i.productoId === productoId)?.cantidad ?? 0;
  }
}
