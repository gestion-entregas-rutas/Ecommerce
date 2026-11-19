import { describe, expect, it } from 'vitest';
import { FormValidator, claveNueva, cedula, correo, telefono, vencimientoTarjeta } from '../../src/app/core/validation/form-rules';

describe('form-rules', () => {
  it('claveNueva replica las reglas del backend', () => {
    expect(claveNueva('corta', {})).toContain('12 caracteres');
    expect(claveNueva('sinmayuscula1!!', {})).toContain('mayúscula');
    expect(claveNueva('SINMINUSCULA1!!', {})).toContain('minúscula');
    expect(claveNueva('SinNumeroAqui!!', {})).toContain('número');
    expect(claveNueva('SinSimbolo1234', {})).toContain('símbolo');
    expect(claveNueva('Valida12345!x', {})).toBeNull();
  });

  it('valida correo, teléfono y cédula', () => {
    expect(correo('abc', {})).toBeTruthy();
    expect(correo('a@b.com', {})).toBeNull();
    expect(telefono('12ab', {})).toBeTruthy();
    expect(telefono('099999999', {})).toContain('10 dígitos');
    expect(telefono('09999999999', {})).toContain('10 dígitos');
    expect(telefono('0999999999', {})).toBeNull();
    expect(cedula('123', {})).toContain('10 dígitos');
    expect(cedula('1803456789', {})).toBeNull();
  });

  it('valida vencimiento de tarjeta', () => {
    expect(vencimientoTarjeta('13/30', {})).toContain('mes');
    expect(vencimientoTarjeta('01/20', {})).toContain('vencida');
    expect(vencimientoTarjeta('12/99', {})).toBeNull();
  });

  it('FormValidator muestra el error mientras se escribe, sin esperar al envío', () => {
    const v = new FormValidator<{ correo: string }>({ correo });
    const f = { correo: '' };
    expect(v.error(f, 'correo')).toBe('');        // vacío y sin interactuar: no molesta
    f.correo = 'ab';
    expect(v.error(f, 'correo')).toBeTruthy();    // escribiendo: error inmediato
    f.correo = '';
    v.tocar('correo');
    expect(v.error(f, 'correo')).toContain('obligatorio'); // tras salir del campo
    f.correo = 'a@b.com';
    expect(v.error(f, 'correo')).toBe('');
  });

  it('validar() marca todo como enviado', () => {
    const v = new FormValidator<{ correo: string }>({ correo });
    const f = { correo: '' };
    expect(v.validar(f)).toBe(false);
    expect(v.error(f, 'correo')).toContain('obligatorio');
  });
});
