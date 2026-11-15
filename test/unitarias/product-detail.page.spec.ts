import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProductDetailPage } from '../../src/app/features/product/product-detail.page';
import { CatalogService } from '../../src/app/core/services/catalog.service';
import { CartService } from '../../src/app/core/services/cart.service';
import { AuthService } from '../../src/app/core/services/auth.service';
import { Producto } from '../../src/app/core/models/api.models';

describe('ProductDetailPage (Unit Test)', () => {
  let fixture: ComponentFixture<ProductDetailPage>;
  let component: ProductDetailPage;
  let catalogMock: { getProducto: ReturnType<typeof vi.fn>; crearResena: ReturnType<typeof vi.fn> };
  let cartMock: { addItem: ReturnType<typeof vi.fn> };
  let authMock: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    isCliente: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  const mockProduct: Producto = {
    id: 'prod-001',
    nombre: 'Cafetera Espresso Premium',
    precioBase: 120,
    precioOferta: 99.99,
    stock: 15,
    descripcionCorta: 'Cafetera de alta calidad con espumador.',
    categoriaNombre: 'Hogar',
    marca: 'BaristaPro',
    imagenPrincipalUrl: 'https://example.com/img1.jpg',
    fichaTecnica: [{ clave: 'Potencia', valor: '1500W' }],
    sobreEsteArticulo: ['Garantía de 1 año', 'Fácil limpieza'],
    resenas: [],
  };

  beforeEach(async () => {
    catalogMock = {
      getProducto: vi.fn().mockReturnValue(of(mockProduct)),
      crearResena: vi.fn(),
    };
    cartMock = {
      addItem: vi.fn().mockReturnValue(of({ items: [] })),
    };
    authMock = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      isCliente: vi.fn().mockReturnValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetailPage],
      providers: [
        provideRouter([]),
        { provide: CatalogService, useValue: catalogMock },
        { provide: CartService, useValue: cartMock },
        { provide: AuthService, useValue: authMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'prod-001' }),
              queryParamMap: convertToParamMap({ entrega: 'RetiroTienda' }),
            },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(ProductDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe cargar el producto por ID desde el catálogo al inicializarse', () => {
    expect(catalogMock.getProducto).toHaveBeenCalledWith('prod-001');
    expect(component.producto?.nombre).toBe('Cafetera Espresso Premium');
    expect(component.deliveryMode).toBe('RetiroTienda');
    expect(component.loading).toBe(false);
  });

  it('debe calcular el precio actual considerando precio de oferta', () => {
    expect(component.precioActual()).toBe(99.99);
  });

  it('addToCart() debe agregar el producto al carrito con la cantidad seleccionada', () => {
    component.cantidad = 2;
    component.addToCart();

    expect(cartMock.addItem).toHaveBeenCalledWith('prod-001', 2);
    expect(component.actionMsg).toContain('Producto agregado al carrito');
  });

  it('buyNow() debe agregar al carrito y navegar a checkout para usuario autenticado', () => {
    component.buyNow();

    expect(cartMock.addItem).toHaveBeenCalledWith('prod-001', 1);
    expect(router.navigate).toHaveBeenCalledWith(['/checkout'], {
      queryParams: { entrega: 'RetiroTienda' },
    });
  });

  it('submitReview() debe registrar reseña con calificación y recargar detalle', () => {
    catalogMock.crearResena.mockReturnValue(of({ id: 'r1' }));
    component.review = { calificacion: 5, comentario: 'Excelente café' };

    component.submitReview();

    expect(catalogMock.crearResena).toHaveBeenCalledWith('prod-001', {
      calificacion: 5,
      comentario: 'Excelente café',
    });
    expect(component.reviewMsg).toContain('Reseña publicada');
  });
});
