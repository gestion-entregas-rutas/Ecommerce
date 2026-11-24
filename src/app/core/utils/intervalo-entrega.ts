/** El negocio opera en Ecuador: los horarios siempre se muestran en su zona, no en la del navegador. */
export const ZONA_NEGOCIO = 'America/Guayaquil';

const hora = new Intl.DateTimeFormat('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA_NEGOCIO });
const dia = new Intl.DateTimeFormat('es-EC', { weekday: 'short', day: 'numeric', month: 'short', timeZone: ZONA_NEGOCIO });

/** "08:00" en la zona del negocio. */
export function horaLocal(iso: string): string {
  return hora.format(new Date(iso));
}

/** "08:00 – 08:30". */
export function rangoHorario(inicio: string, fin: string): string {
  return `${horaLocal(inicio)} – ${horaLocal(fin)}`;
}

/** "sáb, 14 feb · 08:00 – 08:30". */
export function intervaloLegible(inicio?: string | null, fin?: string | null): string {
  if (!inicio || !fin) return '';
  return `${dia.format(new Date(inicio))} · ${rangoHorario(inicio, fin)}`;
}

const PUNTUALIDAD: Record<string, { texto: (min: number | null) => string; tono: 'ok' | 'aviso' | 'error' | 'info' | 'neutro' }> = {
  SinCompromiso: { texto: () => 'Sin horario comprometido', tono: 'neutro' },
  SinEstimacion: { texto: () => 'Sin estimación', tono: 'neutro' },
  DentroDelPlazoPrevisto: { texto: () => 'A tiempo (estimado)', tono: 'ok' },
  RetrasoPrevisto: { texto: (m) => `Retraso previsto${m ? `: +${m} min` : ''}`, tono: 'aviso' },
  PlazoVencido: { texto: (m) => `Plazo vencido${m ? ` hace ${m} min` : ''}`, tono: 'error' },
  EntregadoEnIntervalo: { texto: () => 'Entregado a tiempo', tono: 'ok' },
  EntregadoConRetraso: { texto: (m) => `Entregado con ${m ?? 0} min de retraso`, tono: 'error' },
  EntregadoAntesDelIntervalo: { texto: () => 'Entregado antes del horario', tono: 'info' },
  NoAplica: { texto: () => 'No aplica', tono: 'neutro' },
};

/** Texto y tono para el estado de puntualidad calculado por el backend. */
export function puntualidadLegible(p?: { estado: string; retrasoMinutos: number | null } | null) {
  if (!p) return null;
  const d = PUNTUALIDAD[p.estado];
  return d ? { texto: d.texto(p.retrasoMinutos), tono: d.tono } : { texto: p.estado, tono: 'neutro' as const };
}
