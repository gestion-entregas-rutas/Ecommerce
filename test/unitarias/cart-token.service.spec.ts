import { TestBed } from '@angular/core/testing';
import { CartTokenService } from '../../src/app/core/services/cart-token.service';
import { StorageService } from '../../src/app/core/services/storage.service';
import { environment } from '../../src/environments/environment';

describe('CartTokenService (Unit Test)', () => {
  let service: CartTokenService;
  let storageMock: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    storageMock = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CartTokenService,
        { provide: StorageService, useValue: storageMock },
      ],
    });

    service = TestBed.inject(CartTokenService);
  });

  it('get() debe recuperar el token de carrito del storage', () => {
    storageMock.get.mockReturnValue('token-123');
    expect(service.get()).toBe('token-123');
    expect(storageMock.get).toHaveBeenCalledWith(environment.cartTokenStorageKey);
  });

  it('set() debe almacenar el token si es válido', () => {
    service.set('token-456');
    expect(storageMock.set).toHaveBeenCalledWith(environment.cartTokenStorageKey, 'token-456');
  });

  it('set() no debe almacenar si el token es nulo o vacío', () => {
    service.set(null);
    service.set(undefined);
    service.set('');
    expect(storageMock.set).not.toHaveBeenCalled();
  });

  it('clear() debe eliminar el token del storage', () => {
    service.clear();
    expect(storageMock.remove).toHaveBeenCalledWith(environment.cartTokenStorageKey);
  });
});
