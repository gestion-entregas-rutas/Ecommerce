import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/** Ícono de imagen gris (SVG) que se muestra cuando la foto de un producto no carga. */
const MARCADOR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none" stroke="#8F7FA3" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="16" y="20" width="64" height="56" rx="8"/><circle cx="36" cy="40" r="6"/><path d="M16 66l20-18 16 14 12-10 16 14"/></svg>',
  );

/**
 * Si la imagen falla (foto borrada, enlace roto, sin red), cambia por un ícono de imagen
 * en lugar de mostrar el texto alternativo y el ícono de "imagen rota" del navegador.
 * Uso: <img imgFallback [src]="..." [alt]="..." />
 */
@Directive({ standalone: true, selector: 'img[imgFallback]' })
export class ImgFallbackDirective {
  private readonly img = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;

  @HostListener('error')
  alFallar() {
    if (this.img.dataset['fallback']) return; // evita bucles si el marcador también fallara
    this.img.dataset['fallback'] = '1';
    this.img.src = MARCADOR;
    this.img.classList.add("opacity-80");
  }
}
