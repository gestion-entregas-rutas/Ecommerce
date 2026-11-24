import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { CheckoutPage } from '../../src/app/features/checkout/checkout.page';
import { OrdersPage } from '../../src/app/features/orders/orders.page';
import { CartService } from '../../src/app/core/services/cart.service';
import { CatalogService } from '../../src/app/core/services/catalog.service';
import { OrderService } from '../../src/app/core/services/order.service';
import { DeliverySlotsService } from '../../src/app/core/services/delivery-slots.service';
import { IntervalosDisponibles, OrdenResumen } from '../../src/app/core/models/api.models';
import { horaLocal, intervaloLegible, puntualidadLegible, rangoHorario } from '../../src/app/core/utils/intervalo-entrega';

// 13:00Z = 08:00 en America/Guayaquil (UTC-5, sin horario de verano).
const oferta = (disponibles = [true, false]): IntervalosDisponibles => ({
  fecha: '2027-02-14', zonaId: 'z1', zonaNombre: 'Centro', duracionMinutos: 30,
  modeloEstimacion: 'HaversineAjustadoV1', calculadoEn: '2027-02-13T12:00:00Z',
  intervalos: [
    { inicioEn: '2027-02-14T13:00:00Z', finEn: '2027-02-14T13:30:00Z', disponible: disponibles[0], motivo: disponibles[0] ? null : 'SinCapacidad' },
    { inicioEn: '2027-02-14T13:30:00Z', finEn: '2027-02-14T14:00:00Z', disponible: disponibles[1], motivo: disponibles[1] ? null : 'SinCapacidad' },
  ],
});

describe('Formato de intervalos', () => {
  it('muestra horas en la zona del negocio, no en la del navegador', () => {
    expect(horaLocal('2027-02-14T13:00:00Z')).toBe('08:00');
    expect(rangoHorario('2027-02-14T13:00:00Z', '2027-02-14T13:30:00Z')).toBe('08:00 – 08:30');
    expect(intervaloLegible('2027-02-14T13:00:00Z', '2027-02-14T13:30:00Z')).toContain('08:00 – 08:30');
    expect(intervaloLegible(null, null)).toBe('');
  });

  it('traduce la puntualidad calculada por el backend', () => {
    expect(puntualidadLegible({ estado: 'RetrasoPrevisto', retrasoMinutos: 12 })).toEqual({ texto: 'Retraso previsto: +12 min', tono: 'aviso' });
    expect(puntualidadLegible({ estado: 'SinEstimacion', retrasoMinutos: null })?.texto).toBe('Sin estimación');
    expect(puntualidadLegible(null)).toBeNull();
  });
});

describe('CheckoutPage · intervalos de entrega', () => {
  let fixture: ComponentFixture<CheckoutPage>;
  let component: CheckoutPage;
  let slots: { intervalos: ReturnType<typeof vi.fn> };
  let orders: { checkout: ReturnType<typeof vi.fn>; guardarDetalle: ReturnType<typeof vi.fn> };
  const items = [{ productoId: 'p1', nombre: 'Audífonos', cantidad: 1, precioUnitario: 50, subtotal: 50 }];

  beforeEach(async () => {
    vi.useFakeTimers();
    slots = { intervalos: vi.fn().mockReturnValue(of(oferta())) };
    orders = { checkout: vi.fn(), guardarDetalle: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: {
          items: vi.fn().mockReturnValue(items), subtotal: vi.fn().mockReturnValue(50), count: vi.fn().mockReturnValue(1),
          cart: vi.fn().mockReturnValue({ items, subtotal: 50, requiereRevision: false }),
          cotizacion: vi.fn().mockReturnValue(of({})), load: vi.fn().mockReturnValue(of({})), clearLocal: vi.fn() } },
        { provide: CatalogService, useValue: { getZonasCobertura: vi.fn().mockReturnValue(of([])) } },
        { provide: OrderService, useValue: orders },
        { provide: DeliverySlotsService, useValue: slots },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ entrega: 'Domicilio' }) } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CheckoutPage);
    component = fixture.componentInstance;
    component.initMap = vi.fn();
    component.drawZones = vi.fn();
    fixture.detectChanges();
    Object.assign(component.domicilio, {
      destinatarioNombre: 'Ana Pérez', destinatarioTelefono: '0991234567', direccionTexto: 'Av. Principal 123',
      fechaEntrega: '2099-02-14', latitud: -1.25, longitud: -78.62,
    });
    component.pago.tipo = 'Transferencia';
    component.validateCoverage(); // sin zonas cargadas: el backend valida la cobertura
  });

  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  const cargar = () => { component.recargarIntervalos(); vi.advanceTimersByTime(400); fixture.detectChanges(); };

  it('consulta la oferta con fecha y coordenadas, y deshabilita los intervalos sin cupo', () => {
    cargar();
    expect(slots.intervalos).toHaveBeenCalledWith('2099-02-14', -1.25, -78.62);
    const botones: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('[role="radio"][aria-checked]'))
      .filter((b: any) => b.textContent.includes('–')) as HTMLButtonElement[];
    expect(botones.length).toBe(2);
    expect(botones[0].disabled).toBe(false);
    expect(botones[1].disabled).toBe(true);
    expect(botones[1].textContent).toContain('Sin cupo');
  });

  it('no permite comprar sin elegir horario', () => {
    cargar();
    component.submit();
    expect(orders.checkout).not.toHaveBeenCalled();
    expect(component.error).toBe('Elige un horario de entrega.');
  });

  it('envía el intervalo exactamente como llegó de la oferta', () => {
    cargar();
    orders.checkout.mockReturnValue(new Subject());
    component.elegirIntervalo(component.oferta!.intervalos[0]);
    component.submit();
    const payload = orders.checkout.mock.calls[0][0];
    expect(payload.datosDomicilio.compromisoInicioEn).toBe('2027-02-14T13:00:00Z');
    expect(payload.datosDomicilio.compromisoFinEn).toBe('2027-02-14T13:30:00Z');
    expect(payload.datosDomicilio.horaEntrega).toBe('08:00:00');
  });

  it('ante 409 INTERVALO_NO_DISPONIBLE avisa, limpia la elección y vuelve a consultar', () => {
    cargar();
    component.elegirIntervalo(component.oferta!.intervalos[0]);
    orders.checkout.mockReturnValue(throwError(() => ({ status: 409, code: 'INTERVALO_NO_DISPONIBLE' })));
    slots.intervalos.mockReturnValue(of(oferta([false, true])));
    component.submit();
    expect(component.error).toContain('acaba de ocuparse');
    expect(component.intervalo).toBeNull();
    vi.advanceTimersByTime(400);
    expect(slots.intervalos).toHaveBeenCalledTimes(2);
    expect(component.oferta!.intervalos[1].disponible).toBe(true);
  });

  it('conserva la elección al recargar solo si sigue disponible', () => {
    cargar();
    component.elegirIntervalo(component.oferta!.intervalos[0]);
    cargar();
    expect(component.intervalo?.inicioEn).toBe('2027-02-14T13:00:00Z');
    slots.intervalos.mockReturnValue(of(oferta([false, true])));
    cargar();
    expect(component.intervalo).toBeNull();
  });

  it('cambiar la fecha descarta el intervalo elegido', () => {
    cargar();
    component.elegirIntervalo(component.oferta!.intervalos[0]);
    component.onFechaChange();
    expect(component.intervalo).toBeNull();
  });

  it('muestra el mensaje del backend si la oferta responde 422', () => {
    slots.intervalos.mockReturnValue(throwError(() => ({ status: 422, userMessage: 'La dirección no tiene cobertura de entrega en una zona activa.' })));
    cargar();
    expect(component.errorIntervalos).toContain('no tiene cobertura');
    expect(fixture.nativeElement.textContent).toContain('no tiene cobertura');
  });
});

describe('OrdersPage · horario y puntualidad', () => {
  it('muestra el horario comprometido o "Sin horario comprometido" en órdenes antiguas', async () => {
    const ordenes: OrdenResumen[] = [
      { ordenId: 'o1', numeroOrden: 'ORD-1', total: 10, tipoEntrega: 'Domicilio', estadoOrden: 'Pagada', estadoPago: 'Confirmado',
        estadoSeguimiento: 'AsignadoARuta', creadaEn: '2027-02-13T12:00:00Z',
        compromisoInicioEn: '2027-02-14T13:00:00Z', compromisoFinEn: '2027-02-14T13:30:00Z',
        finalizacionEstimadaEn: '2027-02-14T13:12:00Z', puntualidad: { estado: 'DentroDelPlazoPrevisto', retrasoMinutos: 0 } },
      { ordenId: 'o2', numeroOrden: 'ORD-2', total: 10, tipoEntrega: 'Domicilio', estadoOrden: 'Pagada', estadoPago: 'Confirmado',
        estadoSeguimiento: 'Pendiente', creadaEn: '2026-01-01T12:00:00Z' },
    ];
    await TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [provideRouter([]), { provide: OrderService, useValue: { misOrdenes: vi.fn().mockReturnValue(of(ordenes)), detalleLocal: vi.fn().mockReturnValue(null) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(OrdersPage);
    fixture.detectChanges();
    const texto: string = fixture.nativeElement.textContent;
    expect(texto).toContain('08:00 – 08:30');
    expect(texto).toContain('Entrega estimada: aprox. 08:12');
    expect(texto).toContain('A tiempo (estimado)');
    expect(texto).toContain('Sin horario comprometido');
  });
});
