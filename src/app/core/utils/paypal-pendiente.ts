/**
 * Recuerda qué pedido se estaba pagando en PayPal mientras la persona está fuera de la tienda.
 * Se guarda en localStorage (y no solo en sessionStorage) para que sobreviva si PayPal abre
 * el retorno en otra pestaña o si se recarga la página.
 */
const CLAVE = 'tienda.paypal.pendiente.v1';
const VIGENCIA_MS = 6 * 60 * 60 * 1000;

export interface PayPalPendiente { ordenId: string; payPalOrderId?: string; ts: number; }

export function guardarPayPalPendiente(ordenId: string, payPalOrderId?: string) {
  try { localStorage.setItem(CLAVE, JSON.stringify({ ordenId, payPalOrderId, ts: Date.now() } satisfies PayPalPendiente)); } catch { /* sin almacenamiento */ }
  try { sessionStorage.setItem('paypal:ordenId', ordenId); } catch { /* sin almacenamiento */ }
}

export function leerPayPalPendiente(): PayPalPendiente | null {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE) || 'null') as PayPalPendiente | null;
    if (p?.ordenId && Date.now() - (p.ts || 0) < VIGENCIA_MS) return p;
    const viejo = sessionStorage.getItem('paypal:ordenId');
    return viejo ? { ordenId: viejo, ts: Date.now() } : null;
  } catch { return null; }
}

export function borrarPayPalPendiente() {
  try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
  try { sessionStorage.removeItem('paypal:ordenId'); } catch { /* sin almacenamiento */ }
}
