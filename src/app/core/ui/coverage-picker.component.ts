import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild, effect } from '@angular/core';
import * as L from 'leaflet';
import { CoverageService } from '../services/coverage.service';
import { configurarIconosLeaflet, iconoCasa } from '../utils/leaflet-icons';

/** Ventana con el mapa de zonas de entrega; el cliente marca su ubicación y ve al instante si le llegamos. */
@Component({
  standalone: true,
  selector: 'app-coverage-picker',
  template: `
  <div class="fixed inset-0 z-[900] grid place-items-center bg-[rgba(27,18,48,.5)] p-4" (click)="cerrar()">
    <div class="surface-card flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="cov-title" (click)="$event.stopPropagation()">
      <div class="flex items-start justify-between gap-4 p-5 pb-3">
        <div>
          <h2 id="cov-title" class="font-title-md">¿Dónde recibes tu pedido?</h2>
          <p class="mt-1 font-body-sm text-on-surface-variant">Las zonas moradas tienen entrega. Toca el mapa para marcar tu ubicación.</p>
        </div>
        <button type="button" class="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-low" aria-label="Cerrar" (click)="cerrar()"><span class="material-symbols-outlined">close</span></button>
      </div>
      <div #mapEl class="mx-5 h-[340px] overflow-hidden rounded-xl border border-separator-hairline-light"></div>
      <div class="p-5 pt-3">
        @switch (cov.estado()) {
          @case ('cubierta') { <p class="rounded-lg badge-green px-3 py-2 font-body-sm" role="status">Entregamos en <strong>{{ cov.zona()?.nombre }}</strong>. Tu pedido puede llegar hoy.</p> }
          @case ('fuera') { <p class="rounded-lg badge-red px-3 py-2 font-body-sm" role="status">Todavía no llegamos a ese punto. Prueba con otro dentro de una zona morada, o elige retiro en tienda.</p> }
          @default { <p class="rounded-lg surface-subtle px-3 py-2 font-body-sm text-on-surface-variant">Aún no marcaste tu ubicación.</p> }
        }
        <div class="mt-4 flex flex-wrap justify-end gap-2">
          @if (cov.punto()) { <button type="button" class="btn-ghost" (click)="cov.limpiar(); dibujarMarcador()">Quitar ubicación</button> }
          <button type="button" class="btn-primary" (click)="cerrar()">Listo</button>
        </div>
      </div>
    </div>
  </div>
  `,
  imports: [],
})
export class CoveragePickerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;
  private map?: L.Map; private marker?: L.Marker; private capas: L.Polygon[] = [];

  constructor(public cov: CoverageService) {
    configurarIconosLeaflet();
    // Si las zonas llegan después de abrir el mapa, se dibujan en cuanto estén.
    effect(() => { this.cov.zonas(); this.dibujarZonas(); });
  }

  ngAfterViewInit() {
    const p = this.cov.punto();
    this.map = L.map(this.mapEl.nativeElement).setView(p ? [p.lat, p.lng] : [-1.2416, -78.6197], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(this.map);
    this.map.on('click', (e: L.LeafletMouseEvent) => { this.cov.fijar(e.latlng.lat, e.latlng.lng); this.dibujarMarcador(); });
    this.dibujarZonas(); this.dibujarMarcador();
    setTimeout(() => this.map?.invalidateSize(), 50);
  }

  ngOnDestroy() { this.map?.remove(); }

  @HostListener('document:keydown.escape') cerrar() { this.cov.cerrarSelector(); }

  private dibujarZonas() {
    if (!this.map) return;
    this.capas.forEach((c) => c.remove()); this.capas = [];
    for (const z of this.cov.zonas()) {
      const pts = (z.poligono ?? []).map((v) => [v.latitud, v.longitud] as [number, number]);
      if (pts.length >= 3) this.capas.push(L.polygon(pts, { color: '#6A1B9A', weight: 2, fillColor: '#7E23DF', fillOpacity: 0.14 }).bindTooltip(z.nombre ?? 'Zona', { sticky: true }).addTo(this.map));
    }
    if (this.capas.length && !this.cov.punto()) this.map.fitBounds(L.featureGroup(this.capas).getBounds(), { padding: [24, 24] });
  }

  dibujarMarcador() {
    if (!this.map) return;
    const p = this.cov.punto();
    if (!p) { this.marker?.remove(); this.marker = undefined; return; }
    if (this.marker) this.marker.setLatLng([p.lat, p.lng]); else this.marker = L.marker([p.lat, p.lng], { icon: iconoCasa() }).addTo(this.map);
  }
}
