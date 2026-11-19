import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../src/app/core/services/auth.service';
import { StorageService } from '../../src/app/core/services/storage.service';
import { environment } from '../../src/environments/environment';
import { UsuarioSesion, AuthResponse } from '../../src/app/core/models/api.models';

describe('AuthService (Unit Test)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let storageMock: any;
  let routerMock: { navigateByUrl: ReturnType<typeof vi.fn> };

  const mockUser: UsuarioSesion = {
    id: 'u-1',
    nombreCompleto: 'Usuario Test',
    correo: 'test@example.com',
    rol: 'Cliente',
  };

  const mockAuthResponse: AuthResponse = {
    accessToken: 'jwt-token-123',
    usuario: mockUser,
  };

  beforeEach(() => {
    storageMock = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      remove: vi.fn(),
    };
    routerMock = {
      navigateByUrl: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: StorageService, useValue: storageMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe inicializarse sin usuario ni token si el almacenamiento está vacío', () => {
    expect(service.token()).toBeNull();
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.isCliente()).toBe(false);
  });

  it('debe restaurar la sesión desde el almacenamiento al inicializarse', () => {
    storageMock.get.mockReturnValue({ token: 'saved-token', usuario: mockUser });
    const localService = TestBed.runInInjectionContext(() => new AuthService(
      TestBed.inject(HttpClient),
      storageMock,
      routerMock as any
    ));

    expect(localService.token()).toBe('saved-token');
    expect(localService.user()?.correo).toBe('test@example.com');
    expect(localService.isAuthenticated()).toBe(true);
    expect(localService.isCliente()).toBe(true);
  });

  it('login() debe enviar petición POST y almacenar token y usuario en la sesión', () => {
    service.login({ usuarioOCorreo: 'test@example.com', password: 'Password123!' }).subscribe((res) => {
      expect(res.accessToken).toBe('jwt-token-123');
      expect(res.usuario?.rol).toBe('Cliente');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/autenticacion/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombreUsuario: 'test@example.com',
      clave: 'Password123!',
    });
    req.flush(mockAuthResponse);

    expect(service.token()).toBe('jwt-token-123');
    expect(service.user()?.nombreCompleto).toBe('Usuario Test');
    expect(service.isAuthenticated()).toBe(true);
    expect(storageMock.set).toHaveBeenCalledWith(environment.sessionStorageKey, {
      token: 'jwt-token-123',
      usuario: mockUser,
    });
  });

  it('registroCliente() debe enviar petición POST con los datos del formulario y establecer sesión', () => {
    const payload = {
      nombreCompleto: 'Nuevo Cliente',
      correo: 'nuevo@example.com',
      telefono: '0998877665',
      password: 'Password123!',
    };

    service.registroCliente(payload).subscribe((res) => {
      expect(res.accessToken).toBe('jwt-token-123');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/autenticacion/registro-cliente`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockAuthResponse);

    expect(service.token()).toBe('jwt-token-123');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('me() debe actualizar el usuario de la sesión con la respuesta del perfil', () => {
    // Primero simulamos sesión activa
    service['tokenSignal'].set('jwt-token-123');

    const updatedUser: UsuarioSesion = { ...mockUser, nombreCompleto: 'Nombre Actualizado' };

    service.me().subscribe((usuario) => {
      expect(usuario.nombreCompleto).toBe('Nombre Actualizado');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/autenticacion/me`);
    expect(req.request.method).toBe('GET');
    req.flush(updatedUser);

    expect(service.user()?.nombreCompleto).toBe('Nombre Actualizado');
    expect(storageMock.set).toHaveBeenCalledWith(environment.sessionStorageKey, {
      token: 'jwt-token-123',
      usuario: updatedUser,
    });
  });

  it('logout() debe limpiar la sesión, llamar al endpoint de logout y redirigir a /login', () => {
    service['tokenSignal'].set('jwt-token-123');
    service['userSignal'].set(mockUser);

    service.logout(true);

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/autenticacion/logout`);
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.token()).toBeNull();
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(storageMock.remove).toHaveBeenCalledWith(environment.sessionStorageKey);
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('handleUnauthorized() debe limpiar sesión y redirigir con returnUrl codificado', () => {
    service['tokenSignal'].set('jwt-token-123');

    service.handleUnauthorized('/checkout?entrega=Domicilio');

    expect(service.token()).toBeNull();
    expect(storageMock.remove).toHaveBeenCalledWith(environment.sessionStorageKey);
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith(
      '/login?returnUrl=' + encodeURIComponent('/checkout?entrega=Domicilio')
    );
  });
});
