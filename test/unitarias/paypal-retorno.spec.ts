import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { paypalRetornoGuard } from '../../src/app/core/guards/paypal-retorno.guard';
import { borrarPayPalPendiente, guardarPayPalPendiente, leerPayPalPendiente } from '../../src/app/core/utils/paypal-pendiente';

describe('retorno de PayPal', () => {
  beforeEach(() => { TestBed.configureTestingModule({ providers: [provideRouter([])] }); localStorage.clear(); sessionStorage.clear(); });

  const ejecutar = (path: string, queryParams: any) =>
    TestBed.runInInjectionContext(() => paypalRetornoGuard({ queryParams, routeConfig: { path } } as any, {} as any));

  it('reenvía a la pantalla de retorno si llegan token y PayerID en cualquier ruta', () => {
    const r: any = ejecutar('', { token: 'ABC', PayerID: 'XYZ' });
    expect(TestBed.inject(Router).serializeUrl(r)).toBe('/pago/paypal/retorno?token=ABC&PayerID=XYZ');
  });

  it('muestra el catálogo en la raíz sin parámetros de PayPal', () => {
    expect(ejecutar('', {})).toBe(true);
  });

  it('manda las rutas desconocidas al catálogo', () => {
    const r: any = ejecutar('**', {});
    expect(TestBed.inject(Router).serializeUrl(r)).toBe('/');
  });

  it('recuerda y olvida el pedido que se estaba pagando', () => {
    guardarPayPalPendiente('orden-1', 'PP-1');
    expect(leerPayPalPendiente()?.ordenId).toBe('orden-1');
    borrarPayPalPendiente();
    expect(leerPayPalPendiente()).toBeNull();
  });
});
