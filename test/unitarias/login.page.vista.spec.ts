import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { LoginPage } from '../../src/app/features/auth/login/login.page';
import { AuthService } from '../../src/app/core/services/auth.service';
import { CartService } from '../../src/app/core/services/cart.service';

describe('LoginPage', () => {
  let respuesta: Subject<unknown>;

  beforeEach(async () => {
    respuesta = new Subject();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
        { provide: AuthService, useValue: { login: () => respuesta.asObservable() } },
        { provide: CartService, useValue: {} },
      ],
    }).compileComponents();
  });

  it('con credenciales incorrectas deja de cargar y muestra el error en pantalla', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;
    await fixture.whenStable();
    page.usuarioOCorreo = 'cliente@correo.com';
    page.password = 'incorrecta';
    page.submit();
    await fixture.whenStable();
    const boton = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(boton().textContent).toContain('Ingresando...');

    // La API responde 401 (el interceptor añade userMessage genérico).
    respuesta.error(Object.assign(new HttpErrorResponse({ status: 401 }), { userMessage: 'Tu sesión venció' }));
    await fixture.whenStable();

    expect(page.loading()).toBe(false);
    expect(boton().disabled).toBe(false);
    expect(boton().textContent).toContain('Ingresar');
    expect(fixture.nativeElement.textContent).toContain('Usuario o contraseña incorrectos');
  });
});
