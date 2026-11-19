import { Injectable, computed, inject, signal } from '@angular/core';
import { CatalogService } from './catalog.service';

export interface Punto { lat: number; lng: number; }
export interface ZonaCobertura { id: string | number; nombre?: string; activa?: boolean; poligono?: { latitud: number; longitud: number }[]; }
export type EstadoCobertura = 'sin-ubicacion' | 'cubierta' | 'fuera';

const CLAVE = 'tienda.ubicacion.v1';

/** Ray casting: ¿el punto cae dentro del polígono? */
export function puntoEnPoligono(lat: number, lng: number, poly: { latitud: number; longitud: number }[]) {
  let dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].longitud, yi = poly[i].latitud;
    const xj = poly[j].longitud, yj = poly[j].latitud;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi) dentro = !dentro;
  }
  return dentro;
}

/**
 * Zonas de entrega activas y ubicación elegida por el cliente.
 * Una sola fuente para el encabezado, la ficha de producto y el checkout.
 */
@Injectable({ providedIn: 'root' })
export class CoverageService {
  private readonly catalog = inject(CatalogService);
  private cargadas = false;

  readonly zonas = signal<ZonaCobertura[]>([]);
  readonly punto = signal<Punto | null>(this.leer());
  readonly selectorAbierto = signal(false);

  /** Zona activa que contiene el punto elegido (null si ninguna). */
  readonly zona = computed(() => {
    const p = this.punto();
    if (!p) return null;
    return this.zonas().find((z) => (z.poligono?.length ?? 0) >= 3 && puntoEnPoligono(p.lat, p.lng, z.poligono!)) ?? null;
  });

  readonly estado = computed<EstadoCobertura>(() => {
    if (!this.punto()) return 'sin-ubicacion';
    // Mientras las zonas no cargan no afirmamos que esté fuera de cobertura.
    if (this.zonas().length === 0) return 'sin-ubicacion';
    return this.zona() ? 'cubierta' : 'fuera';
  });

  cargar() {
    if (this.cargadas) return;
    this.cargadas = true;
    this.catalog.getZonasCobertura().subscribe({
      next: (z) => this.zonas.set((z ?? []).filter((x: ZonaCobertura) => x?.activa !== false)),
      error: () => { this.cargadas = false; },
    });
  }

  fijar(lat: number, lng: number) {
    const p = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
    this.punto.set(p);
    try { localStorage.setItem(CLAVE, JSON.stringify(p)); } catch { /* sin almacenamiento */ }
  }

  limpiar() {
    this.punto.set(null);
    try { localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
  }

  abrirSelector() { this.cargar(); this.selectorAbierto.set(true); }
  cerrarSelector() { this.selectorAbierto.set(false); }

  private leer(): Punto | null {
    try {
      const p = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      return p && typeof p.lat === 'number' && typeof p.lng === 'number' ? p : null;
    } catch { return null; }
  }
}
