import { describe, expect, it } from 'vitest';
import { pedidoGrupo, pedidoPaso } from '../../src/app/core/utils/pedido-estado';

describe('pedido-estado', () => {
  it('calcula el paso de un envío a domicilio', () => {
    expect(pedidoPaso({ ordenId: '1', tipoEntrega: 'Domicilio', estadoSeguimiento: 'EnCamino' } as any)).toBe(2);
    expect(pedidoPaso({ ordenId: '1', tipoEntrega: 'Domicilio', estadoSeguimiento: 'Entregado' } as any)).toBe(3);
  });

  it('agrupa los pedidos por estado', () => {
    expect(pedidoGrupo({ ordenId: '1', estadoPago: 'Cancelado' } as any)).toBe('cancelado');
    expect(pedidoGrupo({ ordenId: '1', estadoPago: 'Pendiente', estadoOrden: 'Creada' } as any)).toBe('pendiente');
    expect(pedidoGrupo({ ordenId: '1', tipoEntrega: 'Domicilio', estadoPago: 'Confirmado', estadoSeguimiento: 'EnCamino' } as any)).toBe('curso');
    expect(pedidoGrupo({ ordenId: '1', tipoEntrega: 'Domicilio', estadoPago: 'Confirmado', estadoSeguimiento: 'Entregado' } as any)).toBe('completado');
  });
});
