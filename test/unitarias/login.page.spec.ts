import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginPage } from '../../src/app/features/auth/login/login.page';
import { AuthService } from '../../src/app/core/services/auth.service';
import { CartService } from '../../src/app/core/services/cart.service';

describe('LoginPage (Unit Test)', () => {
  let fixture: ComponentFixture<LoginPage>;
  let component: LoginPage;
  let authMock: { login: ReturnType<typeof vi.fn> };
  let cartMock: { mergeGuestCart: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authMock = { login: vi.fn() };
    cartMock = { mergeGuestCart: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: CartService, useValue: cartMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/checkout' }) },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe leer el returnUrl de los query parameters', () => {
    expect(component.returnUrl).toBe('/checkout');
  });

  it('submit() debe autenticar, fusionar carrito de invitado y navegar al returnUrl', () => {
    authMock.login.mockReturnValue(of({ accessToken: 'jwt', usuario: { rol: 'Cliente' } }));
    cartMock.mergeGuestCart.mockReturnValue(of({ items: [] }));

    component.usuarioOCorreo = 'cliente@correo.com';
    component.password = 'Pass123!';
    component.submit();

    expect(authMock.login).toHaveBeenCalledWith({
      usuarioOCorreo: 'cliente@correo.com',
      password: 'Pass123!',
    });
    expect(cartMock.mergeGuestCart).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/checkout');
    expect(component.loading).toBe(true);
  });

  it('submit() debe mostrar mensaje de error si la autenticación falla', () => {
    authMock.login.mockReturnValue(
      throwError(() => ({ userMessage: 'Credenciales inválidas' }))
    );

    component.usuarioOCorreo = 'bad@correo.com';
    component.password = 'wrong';
    component.submit();

    expect(component.error).toBe('Credenciales inválidas');
    expect(component.loading).toBe(false);
  });
});
