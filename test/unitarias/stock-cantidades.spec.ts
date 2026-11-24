import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CartPage } from '../../src/app/features/cart/cart.page';
import { ProductDetailPage } from '../../src/app/features/product/product-detail.page';
import { CartService } from '../../src/app/core/services/cart.service';
import { CatalogService } from '../../src/app/core/services/catalog.service';
import { AuthService } from '../../src/app/core/services/auth.service';
import { ToastService } from '../../src/app/core/services/toast.service';

const input = (valor: string) => ({ target: Object.assign(document.createElement('input'), { value: valor }) }) as unknown as Event;

describe('Toasts breves', () => {
  it('los avisos se cierran solos en pocos segundos', () => {
    vi.useFakeTimers();
    const toast = new ToastService();
    toast.success('Listo');
    toast.error('Falló');
    expect(toast.toasts().map(t => t.ms)).toEqual([2500, 4500]);
    vi.advanceTimersByTime(2500);
    expect(toast.toasts().map(t => t.message)).toEqual(['Falló']);
    vi.useRealTimers();
  });
});

describe('CartPage · cantidad escrita', () => {
  const item = { productoId: 'p1', nombre: 'Bandas', cantidad: 2, stockDisponible: 5 };
  let cart: any;
  let page: CartPage;
  let toast: { warning: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    cart = { items: () => [item], count: () => 2, subtotal: () => 0, cart: () => ({ items: [item] }),
      updateItem: vi.fn().mockReturnValue(of({})), removeItem: vi.fn(), cotizacion: vi.fn().mockReturnValue(of({})), load: vi.fn() };
    TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [provideRouter([]), { provide: CartService, useValue: cart }, { provide: ToastService, useValue: toast = { warning: vi.fn() } },
        { provide: AuthService, useValue: { isAuthenticated: () => true, isCliente: () => true } }],
    });
    page = TestBed.createComponent(CartPage).componentInstance;
  });

  it('muestra cuántas unidades hay disponibles', () => {
    const fixture = TestBed.createComponent(CartPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('5 disponibles');
  });

  it('no deja pasar del stock y corrige el valor escrito', () => {
    const ev = input('9');
    page.setQty(item, ev);
    expect(cart.updateItem).toHaveBeenCalledWith('p1', 5);
    expect((ev.target as HTMLInputElement).value).toBe('5');
    expect(toast.warning).toHaveBeenCalledWith('Solo hay 5 unidades disponibles de este producto.');
    expect(page.message).toBe(''); // ya no aparece como banner
  });

  it('no envía nada si la cantidad no cambió y convierte valores inválidos en 1', () => {
    page.setQty(item, input('2'));
    expect(cart.updateItem).not.toHaveBeenCalled();
    page.setQty(item, input('abc'));
    expect(cart.updateItem).toHaveBeenCalledWith('p1', 1);
  });
});

describe('ProductDetailPage · límite por stock y carrito', () => {
  it('solo permite agregar lo que queda disponible descontando el carrito', () => {
    TestBed.configureTestingModule({
      imports: [ProductDetailPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'p1' }), queryParamMap: convertToParamMap({}) } } },
        { provide: CatalogService, useValue: { getProducto: () => of({ id: 'p1', nombre: 'Bandas', precioBase: 10, stock: 5, galeriaMultimedia: [] }) } },
        { provide: CartService, useValue: { localQuantityFor: () => 3, addItem: vi.fn().mockReturnValue(of({})) } },
        { provide: AuthService, useValue: { isAuthenticated: () => false, isCliente: () => false, user: () => null } },
      ],
    });
    const fixture = TestBed.createComponent(ProductDetailPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.maxAgregable()).toBe(2);
    const ev = input('10');
    page.cantidadEscrita(ev);
    expect(page.cantidad).toBe(2);
    expect((ev.target as HTMLInputElement).value).toBe('2');
    page.cambiarCantidad(0);
    expect(page.cantidad).toBe(1);
  });
});
