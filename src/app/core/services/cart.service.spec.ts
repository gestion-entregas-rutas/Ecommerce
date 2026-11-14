import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CartService } from './cart.service';
import { environment } from '../../../environments/environment';

describe('CartService', () => {
  let service: CartService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CartService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('persists cart in localStorage and computes count/subtotal', () => {
    const cart = {
      items: [
        { productoId: 'p1', cantidad: 2, precioUnitario: 10, subtotal: 20 },
        { productoId: 'p2', cantidad: 1, precioUnitario: 5, subtotal: 5 },
      ],
      subtotal: 25,
    } as any;
    service.setCart(cart);
    expect(service.count()).toBe(3);
    expect(service.subtotal()).toBe(25);
    const stored = localStorage.getItem(environment.cartStorageKey);
    expect(stored).toContain('p1');
  });

  it('updates item quantity via API and stores response', () => {
    service.updateItem('p1', 4).subscribe();
    const req = http.expectOne(`${environment.apiBaseUrl}/carrito/items/p1`);
    expect(req.request.method).toBe('PUT');
    req.flush({ items: [{ productoId: 'p1', cantidad: 4, precioUnitario: 3, subtotal: 12 }], subtotal: 12 });
    expect(service.count()).toBe(4);
    expect(service.localQuantityFor('p1')).toBe(4);
  });
});
