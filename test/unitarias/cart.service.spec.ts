import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CartService } from '../../src/app/core/services/cart.service';
import { CartTokenService } from '../../src/app/core/services/cart-token.service';
import { StorageService } from '../../src/app/core/services/storage.service';
import { environment } from '../../src/environments/environment';
import { Carrito } from '../../src/app/core/models/api.models';

describe('CartService (Unit Test)', () => {
  let service: CartService;
  let httpMock: HttpTestingController;
  let cartTokenService: CartTokenService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [CartService, CartTokenService, StorageService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CartService);
    cartTokenService = TestBed.inject(CartTokenService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('setCart() persiste el carrito en localStorage y calcula count y subtotal', () => {
    const mockCart: Carrito = {
      items: [
        { productoId: 'prod-1', cantidad: 3, precioUnitario: 10, subtotal: 30 },
        { productoId: 'prod-2', cantidad: 2, precioUnitario: 15, subtotal: 30 },
      ],
      subtotal: 60,
    };

    service.setCart(mockCart);

    expect(service.count()).toBe(5);
    expect(service.subtotal()).toBe(60);
    expect(service.localQuantityFor('prod-1')).toBe(3);
    expect(service.localQuantityFor('prod-2')).toBe(2);
    expect(service.localQuantityFor('prod-inexistente')).toBe(0);

    const stored = localStorage.getItem(environment.cartStorageKey);
    expect(stored).toContain('prod-1');
  });

  it('addItem() envía POST /carrito/items y actualiza el estado reactivo del carrito', () => {
    const updatedCart: Carrito = {
      items: [{ productoId: 'p-1', cantidad: 2, precioUnitario: 25, subtotal: 50 }],
      subtotal: 50,
    };

    service.addItem('p-1', 2).subscribe((res) => {
      expect(res.subtotal).toBe(50);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/carrito/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productoId: 'p-1', cantidad: 2 });
    req.flush(updatedCart);

    expect(service.count()).toBe(2);
    expect(service.subtotal()).toBe(50);
  });

  it('updateItem() envía PUT /carrito/items/:id y actualiza la cantidad local', () => {
    const updatedCart: Carrito = {
      items: [{ productoId: 'p-1', cantidad: 5, precioUnitario: 20, subtotal: 100 }],
      subtotal: 100,
    };

    service.updateItem('p-1', 5).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/carrito/items/p-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ cantidad: 5 });
    req.flush(updatedCart);

    expect(service.count()).toBe(5);
    expect(service.localQuantityFor('p-1')).toBe(5);
  });

  it('removeItem() envía DELETE /carrito/items/:id y refresca el carrito', () => {
    const emptyCart: Carrito = {
      items: [],
      subtotal: 0,
    };

    service.removeItem('p-1').subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/carrito/items/p-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(emptyCart);

    expect(service.count()).toBe(0);
    expect(service.items().length).toBe(0);
  });

  it('cotizacion() solicita GET /carrito/cotizacion y asigna flags de revisión', () => {
    const quoteCart: Carrito = {
      items: [{ productoId: 'p-1', cantidad: 1, precioUnitario: 10, subtotal: 10 }],
      subtotal: 10,
      requiereRevision: true,
      advertencias: ['El precio del producto ha cambiado.'],
    };

    service.cotizacion().subscribe((res) => {
      expect(res.requiereRevision).toBe(true);
      expect(res.advertencias?.length).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/carrito/cotizacion`);
    expect(req.request.method).toBe('GET');
    req.flush(quoteCart);

    expect(service.cart()?.requiereRevision).toBe(true);
  });

  it('mergeGuestCart() envía POST /carrito/merge con el token de invitado existente', () => {
    cartTokenService.set('guest-token-xyz');

    const mergedCart: Carrito = {
      items: [{ productoId: 'p-1', cantidad: 3, precioUnitario: 15, subtotal: 45 }],
      subtotal: 45,
    };

    service.mergeGuestCart().subscribe((res) => {
      expect(res.subtotal).toBe(45);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/carrito/merge`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tokenInvitado: 'guest-token-xyz' });
    req.flush(mergedCart);

    expect(service.count()).toBe(3);
  });

  it('clearLocal() elimina el carrito del almacenamiento y resetea las señales', () => {
    service.setCart({
      items: [{ productoId: 'p-1', cantidad: 1, precioUnitario: 10, subtotal: 10 }],
      subtotal: 10,
    });

    expect(service.count()).toBe(1);

    service.clearLocal();

    expect(service.count()).toBe(0);
    expect(service.subtotal()).toBe(0);
    expect(service.cart()).toBeNull();
  });
});
