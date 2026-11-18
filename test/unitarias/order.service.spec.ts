import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderService } from '../../src/app/core/services/order.service';
import { environment } from '../../src/environments/environment';
import { CheckoutRequest, CheckoutResponse, OrdenResumen } from '../../src/app/core/models/api.models';

describe('OrderService (Unit Test)', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OrderService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('checkout() debe enviar POST a /ordenes/checkout con cabecera Idempotency-Key', () => {
    const payload: CheckoutRequest = {
      items: [{ productoId: 'prod-1', cantidad: 1 }],
      tipoEntrega: 'RetiroTienda',
      datosRetiroTienda: {
        nombreQuienRetira: 'Juan Perez',
        cedulaQuienRetira: '1801234567',
        telefonoContacto: '0991122334',
        fechaRetiro: '2026-11-20',
        franjaHoraria: '10:00 - 12:00',
      },
      metodoPago: {
        tipo: 'Tarjeta',
        titular: 'Juan Perez',
      },
    };

    const mockResponse: CheckoutResponse = {
      ordenId: 'ord-123',
      numeroOrden: 'ORD-2026-0001',
      estadoOrden: 'PendienteDePago',
      total: 75.5,
      tipoEntrega: 'RetiroTienda',
    };

    service.checkout(payload, 'custom-idemp-key-1').subscribe((res) => {
      expect(res.ordenId).toBe('ord-123');
      expect(res.numeroOrden).toBe('ORD-2026-0001');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/ordenes/checkout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('custom-idemp-key-1');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);
  });

  it('confirmarPago() debe enviar POST a /ordenes/:id/pago/confirmar con cabecera Idempotency-Key', () => {
    service.confirmarPago('ord-123', 'idemp-pay-key').subscribe((res: any) => {
      expect(res.estadoOrden).toBe('Pagado');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/ordenes/ord-123/pago/confirmar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idemp-pay-key');
    req.flush({ ordenId: 'ord-123', estadoOrden: 'Pagado' });
  });

  it('cancelarPago() debe enviar POST a /ordenes/:id/pago/cancelar con cabecera Idempotency-Key', () => {
    service.cancelarPago('ord-123', 'idemp-cancel-key').subscribe((res: any) => {
      expect(res.estadoOrden).toBe('Cancelado');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/ordenes/ord-123/pago/cancelar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idemp-cancel-key');
    req.flush({ ordenId: 'ord-123', estadoOrden: 'Cancelado' });
  });

  it('misOrdenes() debe enviar GET a /ordenes/mias y retornar la lista de órdenes', () => {
    const mockOrders: OrdenResumen[] = [
      {
        ordenId: 'ord-1',
        numeroOrden: 'ORD-001',
        total: 50.0,
        estadoOrden: 'Entregado',
        tipoEntrega: 'RetiroTienda',
      },
    ];

    service.misOrdenes().subscribe((res: any) => {
      expect(res.length).toBe(1);
      expect(res[0].numeroOrden).toBe('ORD-001');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/ordenes/mias`);
    expect(req.request.method).toBe('GET');
    req.flush(mockOrders);
  });
});
