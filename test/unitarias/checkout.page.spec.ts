import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { CheckoutPage } from '../../src/app/features/checkout/checkout.page';
import { CartService } from '../../src/app/core/services/cart.service';
import { CatalogService } from '../../src/app/core/services/catalog.service';
import { OrderService } from '../../src/app/core/services/order.service';

describe('CheckoutPage (Unit Test)', () => {
  let fixture: ComponentFixture<CheckoutPage>;
  let component: CheckoutPage;
  let cartMock: any;
  let catalogMock: { getZonas: ReturnType<typeof vi.fn> };
  let ordersMock: {
    checkout: ReturnType<typeof vi.fn>;
    confirmarPago: ReturnType<typeof vi.fn>;
    cancelarPago: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  const mockCartItems = [
    {
      productoId: 'prod-1',
      nombre: 'Audífonos Bluetooth',
      cantidad: 1,
      precioUnitario: 50,
      subtotal: 50,
    },
  ];

  beforeEach(async () => {
    cartMock = {
      items: vi.fn().mockReturnValue(mockCartItems),
      subtotal: vi.fn().mockReturnValue(50),
      cart: vi.fn().mockReturnValue({ items: mockCartItems, subtotal: 50, requiereRevision: false }),
      cotizacion: vi.fn().mockReturnValue(of({ items: mockCartItems, subtotal: 50 })),
      load: vi.fn().mockReturnValue(of({})),
      clearLocal: vi.fn(),
    };

    catalogMock = {
      getZonas: vi.fn().mockReturnValue(of([])),
    };

    ordersMock = {
      checkout: vi.fn(),
      confirmarPago: vi.fn(),
      cancelarPago: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: cartMock },
        { provide: CatalogService, useValue: catalogMock },
        { provide: OrderService, useValue: ordersMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ entrega: 'RetiroTienda' }) },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(CheckoutPage);
    component = fixture.componentInstance;
    component.initMap = vi.fn();
    component.drawZones = vi.fn();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe inicializarse con la modalidad de entrega provista en la URL', () => {
    expect(component.tipoEntrega).toBe('RetiroTienda');
    expect(catalogMock.getZonas).toHaveBeenCalled();
  });

  it('setTipo() debe alternar entre RetiroTienda y Domicilio', () => {
    component.setTipo('Domicilio');
    expect(component.tipoEntrega).toBe('Domicilio');

    component.setTipo('RetiroTienda');
    expect(component.tipoEntrega).toBe('RetiroTienda');
  });

  it('formatCard() debe formatear el número de tarjeta con espacios cada 4 dígitos', () => {
    component.card.numero = '1234567812345678';
    component.formatCard();
    expect(component.card.numero).toBe('1234 5678 1234 5678');
  });

  it('confirmarPago() debe enviar orden a confirmar y actualizar estado', () => {
    ordersMock.confirmarPago.mockReturnValue(of({ estadoOrden: 'Pagado' }));
    component.success = {
      ordenId: 'ord-1',
      numeroOrden: 'ORD-1',
      estadoOrden: 'PendienteDePago',
      total: 50,
      tipoEntrega: 'RetiroTienda',
    };

    component.confirmarPago();

    expect(ordersMock.confirmarPago).toHaveBeenCalledWith('ord-1', component.confirmKey);
    expect(component.confirmed).toBe(true);
  });

  it('cancelarPago() debe enviar orden a cancelar y actualizar estado', () => {
    ordersMock.cancelarPago.mockReturnValue(of({ estadoOrden: 'Cancelado' }));
    component.success = {
      ordenId: 'ord-1',
      numeroOrden: 'ORD-1',
      estadoOrden: 'PendienteDePago',
      total: 50,
      tipoEntrega: 'RetiroTienda',
    };

    component.cancelarPago();

    expect(ordersMock.cancelarPago).toHaveBeenCalledWith('ord-1', component.cancelKey);
    expect(component.cancelled).toBe(true);
  });
});
