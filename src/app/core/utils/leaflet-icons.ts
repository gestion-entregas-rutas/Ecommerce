import * as L from 'leaflet';

let listo = false;

/**
 * Leaflet busca las imágenes del marcador junto a su CSS, y con el empaquetado de Angular
 * esa ruta se rompe (el marcador sale como un ícono roto con la palabra "Marker").
 * Las imágenes se copian a /leaflet/ (ver "assets" en angular.json) y se indican aquí.
 */
export function configurarIconosLeaflet() {
  if (listo) return;
  listo = true;
  L.Icon.Default.mergeOptions({
    iconUrl: '/leaflet/marker-icon.png',
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    shadowUrl: '/leaflet/marker-shadow.png',
  });
}

/** Pin de entrega: círculo morado con una casa, sin depender de imágenes externas. */
export function iconoCasa(): L.DivIcon {
  return L.divIcon({
    className: 'pin-casa-wrap',
    html: '<span class="pin-casa"><span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1">home</span></span>',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}
