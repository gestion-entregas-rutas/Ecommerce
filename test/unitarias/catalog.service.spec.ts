import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogService } from '../../src/app/core/services/catalog.service';
import { environment } from '../../src/environments/environment';
import { Categoria, PaginaDto, Producto } from '../../src/app/core/models/api.models';

describe('CatalogService (Unit Test)', () => {
  let service: CatalogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getCategorias() debe solicitar las categorías y excluir el departamento con numero === 0', () => {
    const rawCategories: Categoria[] = [
      { id: 'cat-0', nombre: 'Todos', numero: 0 },
      { id: 'cat-1', nombre: 'Tecnología', numero: 1 },
      { id: 'cat-2', nombre: 'Hogar', numero: 2 },
    ];

    service.getCategorias().subscribe((cats) => {
      expect(cats.length).toBe(2);
      expect(cats.find((c) => c.numero === 0)).toBeUndefined();
      expect(cats[0].nombre).toBe('Tecnología');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/categorias`);
    expect(req.request.method).toBe('GET');
    req.flush(rawCategories);
  });

  it('getCategorias() debe usar caché observable para evitar peticiones redundantes', () => {
    service.getCategorias().subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/categorias`);
    req.flush([{ id: 'cat-1', nombre: 'Tecnología', numero: 1 }]);

    // Segunda suscripción no debe lanzar nueva petición HTTP
    service.getCategorias().subscribe((cats) => {
      expect(cats.length).toBe(1);
    });
    httpMock.expectNone(`${environment.apiBaseUrl}/categorias`);
  });

  it('getSubcategorias() debe solicitar subcategorías por ID de categoría cuando se provee', () => {
    service.getSubcategorias('cat-1').subscribe((subs) => {
      expect(subs.length).toBe(1);
      expect(subs[0].nombre).toBe('Laptops');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/categorias/cat-1/subcategorias`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'sub-1', categoriaId: 'cat-1', nombre: 'Laptops' }]);
  });

  it('getSubcategorias() debe solicitar todas las subcategorías si no se provee ID', () => {
    service.getSubcategorias().subscribe((subs) => {
      expect(subs.length).toBe(2);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/subcategorias`);
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: 'sub-1', categoriaId: 'cat-1', nombre: 'Laptops' },
      { id: 'sub-2', categoriaId: 'cat-2', nombre: 'Muebles' },
    ]);
  });

  it('getProductos() debe serializar parámetros de consulta y retornar PaginaDto', () => {
    const mockPage: PaginaDto<Producto> = {
      items: [{ id: 'p-1', nombre: 'Laptop Gamer', precioBase: 1200, stock: 5 }],
      total: 1,
      pagina: 1,
      tamanoPagina: 10,
    };

    service
      .getProductos({
        buscar: 'laptop',
        categoriaId: 'cat-1',
        soloOfertas: true,
        precioMin: 500,
        precioMax: 1500,
        pagina: 1,
        tamanoPagina: 10,
      })
      .subscribe((page) => {
        expect(page.total).toBe(1);
        expect(page.items[0].nombre).toBe('Laptop Gamer');
      });

    const req = httpMock.expectOne((r) => r.url.endsWith('/productos'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('buscar')).toBe('laptop');
    expect(req.request.params.get('categoriaId')).toBe('cat-1');
    expect(req.request.params.get('soloOfertas')).toBe('true');
    expect(req.request.params.get('precioMin')).toBe('500');
    expect(req.request.params.get('precioMax')).toBe('1500');
    req.flush(mockPage);
  });

  it('getProducto() debe consultar el detalle de un producto específico por ID', () => {
    const mockProd: Producto = {
      id: 'p-100',
      nombre: 'Smartphone X',
      precioBase: 800,
      stock: 12,
    };

    service.getProducto('p-100').subscribe((p) => {
      expect(p.id).toBe('p-100');
      expect(p.nombre).toBe('Smartphone X');
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/productos/p-100`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProd);
  });

  it('crearResena() debe enviar POST con la calificación y el comentario', () => {
    service.crearResena('p-100', { calificacion: 5, comentario: 'Excelente producto' }).subscribe((res) => {
      expect(res.calificacion).toBe(5);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/productos/p-100/resenas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ calificacion: 5, comentario: 'Excelente producto' });
    req.flush({ id: 'r-1', productoId: 'p-100', calificacion: 5, comentario: 'Excelente producto' });
  });

  it('getZonas() debe solicitar zonas de cobertura disponibles', () => {
    service.getZonas().subscribe((zonas) => {
      expect(zonas.length).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/zonas`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'z-1', nombre: 'Zona Centro' }]);
  });
});
