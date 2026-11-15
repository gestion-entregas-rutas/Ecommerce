import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { CartPage } from '../../src/app/features/cart/cart.page';
import { CartService } from '../../src/app/core/services/cart.service';
import { AuthService } from '../../src/app/core/services/auth.service';

describe('CartPage (Unit Test)', () => {
  let fixture: ComponentFixture<CartPage>;
  let component: CartPage;
  let cartMock: any;
  let authMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    isCliente: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  const sampleItems = [
    {
      productoId: 'p-1',
      nombre: 'Mouse Inalámbrico',
      cantidad: 2,
      precioUnitario: 20,
      subtotal: 40,
      stockDisponible: 10,
    },
  ];

  beforeEach(async () => {
    cartMock = {
      items: vi.fn().mockReturnValue(sampleItems),
      subtotal: vi.fn().mockReturnValue(40),
      cart: vi.fn().mockReturnValue({ items: sampleItems, subtotal: 40, requiereRevision: false }),
      cotizacion: vi.fn().mockReturnValue(of({ items: sampleItems, subtotal: 40 })),
      load: vi.fn().mockReturnValue(of({ items: sampleItems, subtotal: 40 })),
      updateItem: vi.fn().mockReturnValue(of({})),
      removeItem: vi.fn().mockReturnValue(of({})),
    };

    authMock = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      isCliente: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: cartMock },
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(CartPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe refrescar la cotización del carrito al montarse', () => {
    expect(cartMock.cotizacion).toHaveBeenCalled();
  });

  it('inc() debe incrementar la cantidad en 1', () => {
    component.inc(sampleItems[0]);
    expect(cartMock.updateItem).toHaveBeenCalledWith('p-1', 3);
  });

  it('dec() debe decrementar la cantidad en 1 o remover si llega a 0', () => {
    component.dec(sampleItems[0]);
    expect(cartMock.updateItem).toHaveBeenCalledWith('p-1', 1);

    component.dec({ productoId: 'p-1', cantidad: 1 });
    expect(cartMock.removeItem).toHaveBeenCalledWith('p-1');
  });

  it('remove() debe solicitar eliminación del ítem del carrito', () => {
    component.remove('p-1');
    expect(cartMock.removeItem).toHaveBeenCalledWith('p-1');
  });

  it('checkout() redirige a /checkout si el usuario está autenticado como Cliente', () => {
    component.checkout();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/checkout');
  });

  it('checkout() redirige a /login con returnUrl si no está autenticado', () => {
    authMock.isAuthenticated.mockReturnValue(false);
    component.checkout();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/checkout' },
    });
  });
});
