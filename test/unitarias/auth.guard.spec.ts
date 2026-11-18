import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from '../../src/app/core/guards/auth.guard';
import { AuthService } from '../../src/app/core/services/auth.service';

describe('authGuard (Unit Test)', () => {
  let authMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    isCliente: ReturnType<typeof vi.fn>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authMock = {
      isAuthenticated: vi.fn(),
      isCliente: vi.fn(),
    };
    routerMock = {
      createUrlTree: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('permite el acceso si el usuario está autenticado y tiene rol Cliente', () => {
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.isCliente.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/checkout' } as any)
    );

    expect(result).toBe(true);
  });

  it('redirige a /login con returnUrl si el usuario no está autenticado', () => {
    const fakeUrlTree = {} as UrlTree;
    authMock.isAuthenticated.mockReturnValue(false);
    authMock.isCliente.mockReturnValue(false);
    routerMock.createUrlTree.mockReturnValue(fakeUrlTree);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/checkout' } as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/checkout' },
    });
    expect(result).toBe(fakeUrlTree);
  });

  it('redirige a /login si el usuario está autenticado pero no tiene rol Cliente', () => {
    const fakeUrlTree = {} as UrlTree;
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.isCliente.mockReturnValue(false);
    routerMock.createUrlTree.mockReturnValue(fakeUrlTree);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/mis-pedidos' } as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/mis-pedidos' },
    });
    expect(result).toBe(fakeUrlTree);
  });
});
