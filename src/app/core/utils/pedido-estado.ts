import { OrdenResumen } from '../models/api.models';

export type GrupoPedido = 'pendiente' | 'curso' | 'completado' | 'cancelado';

export const pedidoEsRetiro = (o: OrdenResumen) => (o.tipoEntrega || '').toLowerCase() === 'retirotienda';

/** Paso actual del pedido (0 a 3), igual que en Mis pedidos. */
export function pedidoPaso(o: OrdenResumen): number {
  const s = `${o.estadoSeguimiento || ''} ${o.estadoOrden || ''} ${o.estadoPago || ''}`.toLowerCase();
  if (!pedidoEsRetiro(o)) {
    if (/entregad/.test(s)) return 3;
    if (/camino/.test(s)) return 2;
    if (/asignad/.test(s)) return 1;
    return 0;
  }
  if (/entregado|retirado|completad/.test(s)) return 3;
  if (/camino|encamino|listo/.test(s)) return 2;
  if (/prepar|asignad|pagada|confirmado/.test(s)) return 1;
  return 0;
}

export function pedidoGrupo(o: OrdenResumen): GrupoPedido {
  if (/cancelad|fallid|expirad/i.test(`${o.estadoPago} ${o.estadoOrden}`)) return 'cancelado';
  if (/pendiente/i.test(o.estadoPago || '') && !/pagada/i.test(o.estadoOrden || '')) return 'pendiente';
  return pedidoPaso(o) >= 3 ? 'completado' : 'curso';
}

export const PASOS_DOMICILIO = ['Pendiente', 'Asignado', 'En camino', 'Entregado'];
export const PASOS_RETIRO = ['Confirmado', 'Preparando', 'Listo para retiro', 'Retirado'];
export const pedidoPasos = (o: OrdenResumen) => (pedidoEsRetiro(o) ? PASOS_RETIRO : PASOS_DOMICILIO);
