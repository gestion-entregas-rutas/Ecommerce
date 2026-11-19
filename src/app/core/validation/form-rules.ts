import { Component, Input } from '@angular/core';

/** Una regla devuelve el mensaje de error, o null si el valor es válido. */
export type Rule<T = any> = (value: any, form: T) => string | null;

const vacio = (v: any) => v == null || String(v).trim() === '';

export const required = (msg: string): Rule => (v) => (vacio(v) ? msg : null);
export const minLen = (n: number, msg: string): Rule => (v) => (!vacio(v) && String(v).trim().length < n ? msg : null);
export const maxLen = (n: number, msg: string): Rule => (v) => (!vacio(v) && String(v).trim().length > n ? msg : null);
export const pattern = (re: RegExp, msg: string): Rule => (v) => (!vacio(v) && !re.test(String(v).trim()) ? msg : null);

/** Ejecuta las reglas en orden y devuelve el primer error. */
export const compose = (...rules: Rule[]): Rule => (v, f) => {
  for (const r of rules) { const e = r(v, f); if (e) return e; }
  return null;
};

export const nombrePersona = (campo = 'El nombre'): Rule => compose(
  required(`${campo} es obligatorio.`),
  minLen(3, `${campo} debe tener al menos 3 caracteres.`),
  maxLen(150, `${campo} no puede superar los 150 caracteres.`),
  pattern(/^[\p{L}][\p{L}\s.'-]*$/u, `${campo} solo puede contener letras y espacios.`),
);

export const correo: Rule = compose(
  required('El correo es obligatorio.'),
  maxLen(254, 'El correo no puede superar los 254 caracteres.'),
  pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Escribe un correo válido, por ejemplo nombre@dominio.com.'),
);

export const telefono: Rule = compose(
  required('El teléfono es obligatorio.'),
  pattern(/^\d+$/, 'El teléfono solo puede contener números.'),
  pattern(/^\d{10}$/, 'El teléfono debe tener exactamente 10 dígitos.'),
);

export const cedula: Rule = compose(
  required('La cédula es obligatoria.'),
  pattern(/^\d+$/, 'La cédula solo puede contener números.'),
  pattern(/^\d{10}$/, 'La cédula debe tener exactamente 10 dígitos.'),
);

/** Mismas reglas que el backend: 12–128 caracteres, mayúscula, minúscula, número y símbolo. */
export const claveNueva: Rule = (v) => {
  const s = String(v ?? '');
  if (!s) return 'La contraseña es obligatoria.';
  if (s.length < 12) return `La contraseña necesita al menos 12 caracteres (llevas ${s.length}).`;
  if (s.length > 128) return 'La contraseña no puede superar los 128 caracteres.';
  if (!/\p{Lu}/u.test(s)) return 'Agrega al menos una letra mayúscula.';
  if (!/\p{Ll}/u.test(s)) return 'Agrega al menos una letra minúscula.';
  if (!/\d/.test(s)) return 'Agrega al menos un número.';
  if (!/[^\p{L}\d]/u.test(s)) return 'Agrega al menos un símbolo (por ejemplo ! @ # $ %).';
  return null;
};

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const fechaNoPasada = (campo: string): Rule => compose(
  required(`Selecciona la ${campo}.`),
  (v) => (!vacio(v) && String(v) < hoyISO() ? `La ${campo} no puede estar en el pasado.` : null),
);

export const horaEntrega = (fechaDe: (f: any) => string): Rule => (v, f) => {
  if (vacio(v)) return 'Selecciona la hora de entrega.';
  if (fechaDe(f) === hoyISO()) {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (String(v).slice(0, 5) < hhmm) return 'Para entregas de hoy, la hora no puede ser anterior a la actual.';
  }
  return null;
};

export const numeroTarjeta: Rule = compose(
  required('El número de tarjeta es obligatorio.'),
  pattern(/^[\d\s]+$/, 'El número de tarjeta solo puede contener números.'),
  (v) => {
    const d = String(v ?? '').replace(/\D/g, '');
    return d && (d.length < 12 || d.length > 19) ? 'El número de tarjeta debe tener entre 12 y 19 dígitos.' : null;
  },
);

export const vencimientoTarjeta: Rule = compose(
  required('El vencimiento es obligatorio.'),
  pattern(/^\d{2}\/\d{2}$/, 'Usa el formato MM/AA, por ejemplo 08/29.'),
  (v) => {
    const m = /^(\d{2})\/(\d{2})$/.exec(String(v ?? '').trim());
    if (!m) return null;
    const mes = +m[1], anio = 2000 + +m[2];
    if (mes < 1 || mes > 12) return 'El mes debe estar entre 01 y 12.';
    const now = new Date();
    if (anio < now.getFullYear() || (anio === now.getFullYear() && mes < now.getMonth() + 1)) return 'La tarjeta está vencida.';
    return null;
  },
);

export const cvv: Rule = compose(
  required('El CVV es obligatorio.'),
  pattern(/^\d{3,4}$/, 'El CVV debe tener 3 o 4 números.'),
);

/**
 * Estado de validación de un formulario con ngModel.
 * Un error se muestra en cuanto el usuario escribe (el campo ya no está vacío),
 * al salir del campo (blur) o al intentar enviar, siempre debajo del campo.
 */
export class FormValidator<T extends Record<string, any>> {
  private tocados = new Set<string>();
  enviado = false;

  constructor(private reglas: { [K in keyof T]?: Rule<T> }) {}

  /** Mensaje bruto del campo, sin considerar si ya se interactuó con él. */
  private calcular(form: T, campo: keyof T): string {
    return this.reglas[campo]?.(form[campo], form) ?? '';
  }

  /** Mensaje que se debe mostrar bajo el campo ('' si no hay o aún no corresponde). */
  error(form: T, campo: keyof T): string {
    const msg = this.calcular(form, campo);
    if (!msg) return '';
    const escribiendo = !vacio(form[campo]);
    return this.enviado || escribiendo || this.tocados.has(campo as string) ? msg : '';
  }

  tocar(campo: keyof T) { this.tocados.add(campo as string); }

  /** Marca todo como enviado y devuelve true si no hay errores. */
  validar(form: T, campos?: (keyof T)[]): boolean {
    this.enviado = true;
    return this.esValido(form, campos);
  }

  esValido(form: T, campos?: (keyof T)[]): boolean {
    const lista = campos ?? (Object.keys(this.reglas) as (keyof T)[]);
    return lista.every((c) => !this.calcular(form, c));
  }

  reiniciar() { this.tocados.clear(); this.enviado = false; }
}

/** Mensaje de error bajo un campo. */
@Component({
  standalone: true,
  selector: 'app-field-error',
  template: `@if (message) {
    <p role="alert" class="mt-1 flex items-start gap-1 font-body-sm text-red-600"><span class="material-symbols-outlined text-[16px] leading-5">error</span><span>{{ message }}</span></p>
  }`,
})
export class FieldErrorComponent {
  @Input() message = '';
}
