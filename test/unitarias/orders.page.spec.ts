import { provideRouter } from '@angular/router';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { OrdersPage } from '../../src/app/features/orders/orders.page';
import { OrderService } from '../../src/app/core/services/order.service';
import { OrdenResumen } from '../../src/app/core/models/api.models';

describe('OrdersPage (Unit Test)', () => {
  let fixture: ComponentFixture<OrdersPage>;
  let component: OrdersPage;
  let ordersMock: { misOrdenes: ReturnType<typeof vi.fn> };

  const mockOrdersList: OrdenResumen[] = [
    {
      ordenId: 'ord-101',
      numeroOrden: 'ORD-101',
      total: 120,
      tipoEntrega: 'RetiroTienda',
      estadoOrden: 'ListoParaRetiro',
      estadoPago: 'Pagado',
      estadoSeguimiento: 'Listo',
      codigoRetiro: 'RET-9988',
      fechaCreacion: '2026-11-14T12:00:00Z',
    },
    {
      ordenId: 'ord-102',
      numeroOrden: 'ORD-102',
      total: 45.5,
      tipoEntrega: 'Domicilio',
      estadoOrden: 'EnRuta',
      estadoPago: 'Pagado',
      estadoSeguimiento: 'EnCamino',
      fechaCreacion: '2026-11-14T15:00:00Z',
    },
  ];

  beforeEach(async () => {
    ordersMock = {
      misOrdenes: vi.fn().mockReturnValue(of(mockOrdersList)),
    };

    await TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [{ provide: OrderService, useValue: ordersMock }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe cargar y listar las órdenes del cliente al inicializarse', () => {
    expect(ordersMock.misOrdenes).toHaveBeenCalled();
    expect(component.ordenes().length).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('stepIndex() debe calcular correctamente el progreso del pedido', () => {
    // Retiro listo => 2 (listo para retirar)
    expect(component.stepIndex(mockOrdersList[0])).toBe(2);

    // EnCamino => 2
    expect(component.stepIndex(mockOrdersList[1])).toBe(2);

    // Entregado => 3
    const entregado = { ...mockOrdersList[0], estadoSeguimiento: 'Entregado' };
    expect(component.stepIndex(entregado)).toBe(3);
  });

  it('statusMessage() debe generar mensajes claros y acordes a la modalidad de entrega', () => {
    const msgRetiro = component.statusMessage(mockOrdersList[0]);
    expect(msgRetiro).toContain('listo para retiro');

    const msgDomicilio = component.statusMessage(mockOrdersList[1]);
    expect(msgDomicilio).toContain('en camino');
  });

  it('debe manejar error al cargar órdenes mostrando mensaje explicativo', () => {
    ordersMock.misOrdenes.mockReturnValue(
      throwError(() => ({ userMessage: 'Error al conectar con el servidor de pedidos' }))
    );

    component.load();

    expect(component.error()).toBe('Error al conectar con el servidor de pedidos');
    expect(component.loading()).toBe(false);
  });
});
