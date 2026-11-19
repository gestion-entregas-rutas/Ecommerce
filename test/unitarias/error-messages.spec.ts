import { describe, expect, it } from 'vitest';
import { esTextoNoEspanol, mensajeDeError } from '../../src/app/core/errors/error-messages';

const http = (status: number, error: any = {}) => ({ status, error });

describe('mensajeDeError', () => {
  it('traduce el error genérico en inglés de ASP.NET a un mensaje claro en español', () => {
    const m = mensajeDeError(http(500, { title: 'An error occurred while processing your request.', status: 500 }));
    expect(m).toContain('problema de nuestro lado');
    expect(esTextoNoEspanol(m)).toBe(false);
  });

  it('avisa cuando no hay conexión (status 0)', () => {
    expect(mensajeDeError(http(0, new ProgressEvent('error')))).toContain('conexión a internet');
  });

  it('avisa cuando se agota el tiempo', () => {
    expect(mensajeDeError({ name: 'TimeoutError' })).toContain('tardó demasiado');
  });

  it('usa el mensaje en español del backend', () => {
    expect(mensajeDeError(http(422, { detail: 'La dirección no tiene cobertura de entrega en una zona activa.' })))
      .toBe('La dirección no tiene cobertura de entrega en una zona activa.');
  });

  it('prefiere el mensaje del código de negocio', () => {
    expect(mensajeDeError(http(409, { codigo: 'STOCK_AGOTADO' }))).toContain('se agotó');
    expect(mensajeDeError(http(409, { codigo: 'PAGO_NO_CONFIRMABLE' }))).toContain('reserva');
  });

  it('une los errores de validación en español y descarta los que vienen en inglés', () => {
    const m = mensajeDeError(http(400, { errors: { Correo: ['El correo no es válido.'], X: ['The field is invalid.'] } }));
    expect(m).toBe('El correo no es válido.');
  });

  it('ignora títulos en inglés y usa el mensaje por estado', () => {
    expect(mensajeDeError(http(404, { title: 'Not Found' }))).toContain('No encontramos');
    expect(mensajeDeError(http(403, { title: 'Forbidden' }))).toContain('No tienes permiso');
    expect(mensajeDeError(http(429))).toContain('demasiados intentos');
  });

  it('nunca devuelve vacío', () => {
    expect(mensajeDeError(undefined)).toBeTruthy();
    expect(mensajeDeError(http(418))).toBeTruthy();
  });
});
