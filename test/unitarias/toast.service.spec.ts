import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from '../../src/app/core/services/toast.service';

describe('ToastService', () => {
  let toast: ToastService;
  beforeEach(() => { vi.useFakeTimers(); toast = TestBed.inject(ToastService); });
  afterEach(() => vi.useRealTimers());

  it('muestra un aviso y lo retira solo', () => {
    toast.success('Producto agregado correctamente al carrito.');
    expect(toast.toasts()).toHaveLength(1);
    expect(toast.toasts()[0].type).toBe('success');
    vi.advanceTimersByTime(5000);
    expect(toast.toasts()).toHaveLength(0);
  });

  it('no repite el mismo aviso apilado', () => {
    toast.info('Hola'); toast.info('Hola');
    expect(toast.toasts()).toHaveLength(1);
  });

  it('dismiss() cierra el aviso', () => {
    toast.error('Falló');
    toast.dismiss(toast.toasts()[0].id);
    expect(toast.toasts()).toHaveLength(0);
  });
});
