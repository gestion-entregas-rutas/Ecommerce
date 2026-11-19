import { Observable, catchError, throwError, timeout } from 'rxjs';
/**
 * Convierte cualquier error (HTTP, de red, de tiempo de espera o inesperado) en un mensaje en español
 * que diga qué pasó y qué puede hacer la persona. Nunca devuelve texto en inglés ni técnico.
 */

/** Mensajes por código de negocio que envía el backend. */
const POR_CODIGO: Record<string, string> = {
  STOCK_AGOTADO: 'Uno de los productos se agotó o ya no hay suficientes unidades. Actualizamos tu carrito para que lo revises.',
  CONFLICTO_VERSION_PRODUCTO: 'Este producto cambió mientras lo veías. Recarga la página e inténtalo de nuevo.',
  PAGO_NO_CONFIRMABLE: 'La reserva de tu pedido expiró o ya no se puede confirmar. Inicia una nueva compra.',
  PAGO_INVALIDO: 'No pudimos validar el pago. Inténtalo de nuevo.',
  PAGO_YA_CONFIRMADO: 'Este pago ya fue confirmado, por eso no se puede cancelar.',
  PAYPAL_CAPTURA_REQUERIDA: 'Este pedido se paga con PayPal. Aprueba el pago en PayPal para completarlo.',
  PAYPAL_ORDEN_NO_ENCONTRADA: 'No encontramos el pago de PayPal de este pedido. Inicia el pago otra vez.',
  PAYPAL_CAPTURA_NO_CONFIRMADA: 'PayPal no confirmó el cobro completo. No se te cobró nada; inténtalo de nuevo.',
};

/** Mensajes por estado HTTP cuando el backend no trae uno claro en español. */
const POR_ESTADO: Record<number, string> = {
  0: 'No pudimos conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.',
  400: 'Hay datos que no son válidos. Revisa la información e inténtalo de nuevo.',
  401: 'Tu sesión venció o tus datos no son correctos. Inicia sesión de nuevo.',
  403: 'No tienes permiso para hacer esto con tu cuenta.',
  404: 'No encontramos lo que buscabas. Puede que ya no esté disponible.',
  405: 'Esa acción no está disponible en este momento.',
  408: 'La solicitud tardó demasiado. Inténtalo de nuevo.',
  409: 'Algo cambió mientras tanto y no se pudo completar. Actualiza la página e inténtalo de nuevo.',
  413: 'El archivo o los datos enviados son demasiado grandes.',
  422: 'No pudimos completar la acción con esos datos. Revisa la información.',
  429: 'Hiciste demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.',
  500: 'Tuvimos un problema de nuestro lado. Inténtalo de nuevo en unos minutos; si sigue pasando, avísanos.',
  502: 'El servicio no está respondiendo en este momento. Inténtalo de nuevo en unos minutos.',
  503: 'El servicio está en mantenimiento o saturado. Inténtalo de nuevo en unos minutos.',
  504: 'El servidor tardó demasiado en responder. Inténtalo de nuevo en unos minutos.',
};

export const MENSAJE_GENERICO = 'Algo salió mal y no pudimos completar la acción. Inténtalo de nuevo.';
export const MENSAJE_TIEMPO = 'La solicitud tardó demasiado. Revisa tu conexión e inténtalo de nuevo.';

/** ¿El texto parece estar en inglés o ser técnico (p. ej. "An error occurred while processing your request.")? */
export function esTextoNoEspanol(t: unknown): boolean {
  if (typeof t !== 'string' || !t.trim()) return true;
  const texto = t.trim();
  const espanol = /\b(el|la|los|las|de|del|que|por|para|con|no|se|tu|su|un|una|es|en|y|ya|al)\b/i.test(texto) || /[áéíóúñ¿¡]/i.test(texto);
  const ingles = /\b(the|an? error|occurred|request|failed|fail|invalid|unauthorized|forbidden|server|validation|not found|bad request|internal|exception|timeout|network|unknown|while|your|one or more)\b/i.test(texto);
  if (ingles && !espanol) return true;
  // Nombres de excepciones o rastros técnicos
  return /exception|stack ?trace|\bat [\w.]+\(|^\s*[\w.]+Error:/i.test(texto);
}

/** Mensajes de validación por campo (400) en un solo texto legible. */
function mensajesDeValidacion(errors: any): string {
  if (!errors || typeof errors !== 'object') return '';
  const lista: string[] = [];
  for (const v of Object.values(errors)) {
    for (const m of Array.isArray(v) ? v : [v]) if (typeof m === 'string' && !esTextoNoEspanol(m)) lista.push(m);
  }
  return [...new Set(lista)].slice(0, 3).join(' ');
}

/**
 * Mensaje en español para mostrar al usuario.
 * Prioridad: texto en español del backend → mensaje del código de negocio → errores de validación → mensaje por estado HTTP.
 */
export function mensajeDeError(err: any): string {
  if (!err) return MENSAJE_GENERICO;
  if (err.name === 'TimeoutError') return MENSAJE_TIEMPO;

  const estado: number = typeof err.status === 'number' ? err.status : (err.error instanceof ProgressEvent ? 0 : -1);
  const cuerpo = err.error && typeof err.error === 'object' && !(err.error instanceof ProgressEvent) ? err.error : {};

  const codigo = cuerpo.codigo || cuerpo.code;
  if (estado === 0) return POR_ESTADO[0];

  // Texto que el backend escribe para el usuario (en español); el título genérico de ASP.NET queda fuera.
  const deBackend = [cuerpo.mensaje, cuerpo.message, cuerpo.detail, typeof err.error === 'string' ? err.error : '']
    .find((t) => typeof t === 'string' && !esTextoNoEspanol(t)) as string | undefined;
  if (deBackend) return deBackend;

  if (codigo && POR_CODIGO[codigo]) return POR_CODIGO[codigo];

  const deValidacion = mensajesDeValidacion(cuerpo.errors);
  if (deValidacion) return deValidacion;

  if (estado >= 500 && !POR_ESTADO[estado]) return POR_ESTADO[500];
  return POR_ESTADO[estado] ?? MENSAJE_GENERICO;
}

/** Como `timeout`, pero el error de tiempo agotado trae un mensaje en español (`userMessage`). */
export const timeoutEs = (ms: number) => <T>(origen: Observable<T>): Observable<T> =>
  origen.pipe(
    timeout(ms),
    catchError((e) => throwError(() => (e?.name === 'TimeoutError' ? Object.assign(e, { userMessage: MENSAJE_TIEMPO }) : e))),
  );
