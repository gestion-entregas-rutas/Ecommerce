import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { CatalogPage } from './catalog.page';
import { CartService } from '../../core/services/cart.service';

describe('Catalog filters', () => {
  let fixture: ComponentFixture<CatalogPage>;
  let page: CatalogPage;
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const productsRequest = () => http.expectOne(req => req.url.endsWith('/productos'));
  const respond = (request: ReturnType<typeof productsRequest>, name = 'Producto filtrado') => {
    request.flush({ items: [{ id: 'p1', nombre: name, precioBase: 10, stock: 5 }], total: 1, pagina: 1, tamanoPagina: 12 });
  };

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({}));
    await TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { queryParamMap: params, snapshot: {} } },
        { provide: CartService, useValue: {} },
      ],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CatalogPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(req => req.url.endsWith('/categorias')).flush([{ id: '01a1d8a6-b4ef-7e0d-bac0-0bac45512a00', nombre: 'Hogar' }]);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    vi.useRealTimers();
  });

  it('renders the HTTP response without an extra click or manual change detection', async () => {
    respond(productsRequest());
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Producto filtrado');
    expect(fixture.nativeElement.textContent).not.toContain('Buscando...');
  });

  it('preserves the UUID when opening a category URL and renders an empty success', async () => {
    const initial = productsRequest();
    const categoryId = '01a1d8a6-b4ef-7e0d-bac0-0bac45512a00';
    params.next(convertToParamMap({ categoriaId: categoryId }));
    expect(initial.cancelled).toBe(true);
    const request = productsRequest();
    expect(request.request.params.get('categoriaId')).toBe(categoryId);
    request.flush({ items: [], total: 0, pagina: 1, tamanoPagina: 12 });
    await fixture.whenStable();
    expect(page.error).toBe('');
    expect(page.categoryLabel()).toBe('Hogar');
    expect(fixture.nativeElement.textContent).toContain('0 resultados');
    expect(fixture.nativeElement.textContent).toContain('No encontramos productos');
    expect(fixture.nativeElement.textContent).not.toContain('Reintentar');
  });

  it('requests categories immediately and cancels obsolete requests', async () => {
    const initial = productsRequest();
    page.setCategoria('01a1d8a6-b4ef-7e0d-bac0-0bac45512a00');
    expect(initial.cancelled).toBe(true);
    const firstCategory = productsRequest();
    expect(firstCategory.request.params.get('categoriaId')).toBe('01a1d8a6-b4ef-7e0d-bac0-0bac45512a00');
    page.setCategoria('01a1d8a6-b4ef-7036-9366-f4c615488590');
    expect(firstCategory.cancelled).toBe(true);
    const latest = productsRequest();
    expect(latest.request.params.get('categoriaId')).toBe('01a1d8a6-b4ef-7036-9366-f4c615488590');
    respond(latest, 'Última categoría');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Última categoría');
  });

  it('does not duplicate a request when its URL is synchronized', () => {
    respond(productsRequest());
    page.setCategoria('01a1d8a6-b4ef-7e0d-bac0-0bac45512a00');
    const request = productsRequest();
    params.next(convertToParamMap({ categoriaId: '01a1d8a6-b4ef-7e0d-bac0-0bac45512a00' }));
    http.expectNone(req => req.url.endsWith('/productos'));
    expect(request.cancelled).toBe(false);
    respond(request);
  });

  it('discards pending text and price edits when filters are reset', async () => {
    respond(productsRequest());
    page.setCategoria('01a1d8a6-b4ef-7e0d-bac0-0bac45512a00');
    respond(productsRequest());
    vi.useFakeTimers();
    page.onSearchInput('consulta anterior');
    page.setPrecioMin(50);
    page.resetFilters();
    const request = productsRequest();
    expect(request.request.params.has('buscar')).toBe(false);
    expect(request.request.params.has('precioMin')).toBe(false);
    respond(request);
    await vi.advanceTimersByTimeAsync(600);
    http.expectNone(req => req.url.endsWith('/productos'));
    expect(page.filters.buscar).toBe('');
  });

  it('coalesces typing but submits immediately without a later duplicate', async () => {
    respond(productsRequest());
    vi.useFakeTimers();
    page.onSearchInput('a');
    page.onSearchInput('auriculares');
    http.expectNone(req => req.url.endsWith('/productos'));
    page.submitSearch();
    const request = productsRequest();
    expect(request.request.params.get('buscar')).toBe('auriculares');
    respond(request);
    await vi.advanceTimersByTimeAsync(600);
    http.expectNone(req => req.url.endsWith('/productos'));
  });

  it('recovers after an error and allows retrying the same filters', async () => {
    productsRequest().flush({}, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(page.loading).toBe(false);
    expect(page.error).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('0 resultados');
    page.retry();
    respond(productsRequest());
    await fixture.whenStable();
    expect(page.error).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Producto filtrado');
  });
});
