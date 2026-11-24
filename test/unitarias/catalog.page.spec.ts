import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CatalogPage } from '../../src/app/features/catalog/catalog.page';
import { CartService } from '../../src/app/core/services/cart.service';

describe('CatalogPage (Unit Test)', () => {
  let fixture: ComponentFixture<CatalogPage>;
  let page: CatalogPage;
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const productsRequest = () => http.expectOne((req) => req.url.endsWith('/productos'));
  const respond = (request: ReturnType<typeof productsRequest>, name = 'Producto filtrado') => {
    request.flush({
      items: [{ id: 'p1', nombre: name, precioBase: 10, stock: 5 }],
      total: 1,
      pagina: 1,
      tamanoPagina: 12,
    });
  };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({}));
    await TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParamMap: params, snapshot: {} } },
        { provide: CartService, useValue: { localQuantityFor: () => 0 } },
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CatalogPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    http
      .expectOne((req) => req.url.endsWith('/categorias'))
      .flush([{ id: '01a1d8a6-b4ef-7e0d-bac0-0bac45512a00', nombre: 'Hogar' }]);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    vi.useRealTimers();
  });

  it('renderiza la respuesta HTTP sin bloqueos ni requerir doble clic', async () => {
    respond(productsRequest());
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Producto filtrado');
    expect(fixture.nativeElement.textContent).not.toContain('Buscando...');
  });

  it('aplica filtro de categoría inmediatamente y cancela peticiones obsoletas', async () => {
    const initial = productsRequest();
    page.setCategoria('01a1d8a6-b4ef-7e0d-bac0-0bac45512a00');
    expect(initial.cancelled).toBe(true);

    const firstCategory = productsRequest();
    expect(firstCategory.request.params.get('categoriaId')).toBe(
      '01a1d8a6-b4ef-7e0d-bac0-0bac45512a00'
    );
    respond(firstCategory, 'Producto Hogar');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Producto Hogar');
  });

  it('permite buscar productos y procesa la búsqueda inmediata', async () => {
    respond(productsRequest());
    vi.useFakeTimers();
    page.onSearchInput('teclado');
    page.submitSearch();

    const request = productsRequest();
    expect(request.request.params.get('buscar')).toBe('teclado');
    respond(request, 'Teclado Mecánico');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Teclado Mecánico');
  });

  it('recuperación ante error de red mostrando botón Reintentar', async () => {
    productsRequest().flush({}, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(page.loading).toBe(false);
    expect(page.error).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Reintentar');

    page.retry();
    respond(productsRequest());
    await fixture.whenStable();
    expect(page.error).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Producto filtrado');
  });
});
