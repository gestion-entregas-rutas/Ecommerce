import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from '../../src/app/app';

describe('App Component (Unit Test)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('debe instanciar el componente principal', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('debe renderizar el nombre de la tienda en el encabezado', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Tienda');
  });

  it('debe cargar y renderizar los enlaces de departamentos y ofertas', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/categorias'))
      .flush([{ id: 42, nombre: 'Hogar y cocina', numero: 1 }]);
    fixture.componentInstance.showMenu = true;
    fixture.detectChanges();
    await fixture.whenStable();

    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    expect(
      links.find((l) => l.textContent?.trim() === 'Hogar y cocina')?.getAttribute('href')
    ).toBe('/productos?categoriaId=42');
    expect(
      links.find((l) => l.textContent?.trim() === 'Ofertas')?.getAttribute('href')
    ).toBe('/productos?soloOfertas=true');
  });
});
