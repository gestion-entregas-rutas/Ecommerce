import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { errorInterceptor } from '../../src/app/core/interceptors/error.interceptor';
import { AuthService } from '../../src/app/core/services/auth.service';
import { CartTokenService } from '../../src/app/core/services/cart-token.service';

describe('errorInterceptor (Unit Test)', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authMock: { handleUnauthorized: ReturnType<typeof vi.fn> };
  let cartTokenMock: { set: ReturnType<typeof vi.fn> };
  let routerMock: { url: string };

  beforeEach(() => {
    authMock = { handleUnauthorized: vi.fn() };
    cartTokenMock = { set: vi.fn() };
    routerMock = { url: '/checkout' };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authMock },
        { provide: CartTokenService, useValue: cartTokenMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe capturar la cabecera X-Cart-Token de respuestas exitosas y guardarla', () => {
    httpClient.get('/api/carrito').subscribe();

    const req = httpMock.expectOne('/api/carrito');
    req.event(
      new HttpResponse({
        body: { items: [] },
        headers: req.request.headers.set('X-Cart-Token', 'new-token-abc'),
      })
    );

    expect(cartTokenMock.set).toHaveBeenCalledWith('new-token-abc');
  });

  it('debe enriquecer los errores HTTP con userMessage y problem details', () => {
    const errorPayload = {
      codigo: 'STOCK_AGOTADO',
      mensaje: 'El producto seleccionado no cuenta con suficiente stock.',
    };

    httpClient.post('/api/ordenes/checkout', {}).subscribe({
      error: (err) => {
        expect(err.userMessage).toBe('El producto seleccionado no cuenta con suficiente stock.');
        expect(err.code).toBe('STOCK_AGOTADO');
        expect(err.problem).toEqual(errorPayload);
      },
    });

    const req = httpMock.expectOne('/api/ordenes/checkout');
    req.flush(errorPayload, { status: 409, statusText: 'Conflict' });
  });

  it('ante error 401 en ruta protegida debe invocar handleUnauthorized con la URL actual', () => {
    httpClient.get('/api/ordenes/mias').subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/api/ordenes/mias');
    req.flush({ mensaje: 'No autorizado' }, { status: 401, statusText: 'Unauthorized' });

    expect(authMock.handleUnauthorized).toHaveBeenCalledWith('/checkout');
  });

  it('ante error 401 en petición de login no debe llamar a handleUnauthorized', () => {
    httpClient.post('/api/autenticacion/login', {}).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/api/autenticacion/login');
    req.flush({ mensaje: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });

    expect(authMock.handleUnauthorized).not.toHaveBeenCalled();
  });
});
