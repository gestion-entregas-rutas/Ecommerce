import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegistroPage } from '../../src/app/features/auth/registro/registro.page';
import { AuthService } from '../../src/app/core/services/auth.service';
import { CartService } from '../../src/app/core/services/cart.service';

describe('RegistroPage (Unit Test)', () => {
  let fixture: ComponentFixture<RegistroPage>;
  let component: RegistroPage;
  let authMock: { registroCliente: ReturnType<typeof vi.fn> };
  let cartMock: { mergeGuestCart: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authMock = { registroCliente: vi.fn() };
    cartMock = { mergeGuestCart: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [RegistroPage],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: CartService, useValue: cartMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ returnUrl: '/' }) },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(RegistroPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe inicializarse con el formulario en blanco', () => {
    expect(component.form.nombreCompleto).toBe('');
    expect(component.form.correo).toBe('');
    expect(component.error()).toBe('');
    expect(component.loading()).toBe(false);
  });

  it('submit() debe registrar cliente, fusionar carrito y redirigir', () => {
    authMock.registroCliente.mockReturnValue(of({ accessToken: 'jwt', usuario: { rol: 'Cliente' } }));
    cartMock.mergeGuestCart.mockReturnValue(of({ items: [] }));

    component.form = {
      nombreCompleto: 'Maria Perez',
      correo: 'maria@example.com',
      telefono: '0991234567',
      password: 'SecurePassword123!',
    };

    component.submit();

    expect(authMock.registroCliente).toHaveBeenCalledWith(component.form);
    expect(cartMock.mergeGuestCart).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('submit() debe mostrar error si el registro es rechazado (ej. correo duplicado)', () => {
    authMock.registroCliente.mockReturnValue(
      throwError(() => ({ userMessage: 'El correo ya se encuentra registrado.' }))
    );

    component.form = {
      nombreCompleto: 'Maria Perez',
      correo: 'maria@example.com',
      telefono: '0991234567',
      password: 'SecurePassword123!',
    };

    component.submit();

    expect(component.error()).toBe('El correo ya se encuentra registrado.');
    expect(component.loading()).toBe(false);
  });
});
