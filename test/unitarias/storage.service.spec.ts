import { TestBed } from '@angular/core/testing';
import { StorageService } from '../../src/app/core/services/storage.service';

describe('StorageService (Unit Test)', () => {
  let service: StorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [StorageService],
    });
    service = TestBed.inject(StorageService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('set() debe serializar y guardar el valor en localStorage', () => {
    service.set('test_key', { nombre: 'Antigravity', activo: true });
    const raw = localStorage.getItem('test_key');
    expect(raw).toBe(JSON.stringify({ nombre: 'Antigravity', activo: true }));
  });

  it('get() debe deserializar un objeto previamente guardado', () => {
    localStorage.setItem('test_key', JSON.stringify({ count: 42 }));
    const result = service.get<{ count: number }>('test_key');
    expect(result).toEqual({ count: 42 });
  });

  it('get() debe retornar null si la clave no existe', () => {
    const result = service.get('clave_inexistente');
    expect(result).toBeNull();
  });

  it('get() debe retornar null si el JSON es inválido sin lanzar excepción', () => {
    localStorage.setItem('corrupt_key', '{ invalido ...');
    const result = service.get('corrupt_key');
    expect(result).toBeNull();
  });

  it('remove() debe eliminar la clave de localStorage', () => {
    localStorage.setItem('to_delete', 'value');
    service.remove('to_delete');
    expect(localStorage.getItem('to_delete')).toBeNull();
  });
});
