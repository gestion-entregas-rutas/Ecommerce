import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from '../../src/app/core/interceptors/auth.interceptor';
import { AuthService } from '../../src/app/core/services/auth.service';
import { CartTokenService } from '../../src/app/core/services/cart-token.service';

describe('authInterceptor (Unit Test)', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authMock: { token: ReturnType<typeof vi.fn> };
  let cartTokenMock: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authMock = { token: vi.fn().mockReturnValue(null) };
    cartTokenMock = { get: vi.fn().mockReturnValue(null) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authMock },
        { provide: CartTokenService, useValue: cartTokenMock },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('no debe adjuntar cabeceras si no existen tokens', () => {
    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.has('X-Cart-Token')).toBe(false);
    req.flush({});
  });

  it('debe adjuntar Authorization: Bearer cuando el token de auth está presente', () => {
    authMock.token.mockReturnValue('jwt-xyz-123');

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-xyz-123');
    req.flush({});
  });

  it('debe adjuntar X-Cart-Token cuando el token de carrito de invitado está presente', () => {
    cartTokenMock.get.mockReturnValue('cart-token-999');

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('X-Cart-Token')).toBe('cart-token-999');
    req.flush({});
  });

  it('debe adjuntar ambas cabeceras cuando ambos tokens están presentes', () => {
    authMock.token.mockReturnValue('jwt-xyz-123');
    cartTokenMock.get.mockReturnValue('cart-token-999');

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-xyz-123');
    expect(req.request.headers.get('X-Cart-Token')).toBe('cart-token-999');
    req.flush({});
  });
});
