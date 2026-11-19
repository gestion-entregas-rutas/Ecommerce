import { Component } from '@angular/core';
import { ImgFallbackDirective } from './img-fallback.directive';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastService, ToastType } from '../services/toast.service';

const TITULOS: Record<ToastType, string> = {
  success: '¡Listo!',
  info: 'Te informamos',
  warning: 'Atención',
  error: 'No se pudo completar',
};

/** Avisos grandes y visibles, con la identidad morada de la tienda. */
@Component({
  standalone: true,
  selector: 'app-toast-container',
  imports: [RouterLink, DecimalPipe, ImgFallbackDirective],
  template: `
  <div class="pointer-events-none fixed right-4 top-[84px] z-[1000] flex w-[min(94vw,448px)] flex-col gap-3 sm:right-6" aria-live="polite" aria-atomic="false">
    @for (t of toasts.toasts(); track t.id) {
      <div class="toast-in pointer-events-auto relative overflow-hidden rounded-2xl border border-primary/25 bg-white/95 shadow-2xl shadow-[#4A1273]/15 ring-1 ring-black/5 backdrop-blur-md"
           [attr.role]="t.type==='error' ? 'alert' : 'status'">
        <div class="p-4 sm:p-5">
          <div class="flex items-start justify-between gap-3" [class.border-b]="t.producto" [class.border-slate-100]="t.producto" [class.pb-3]="t.producto">
            <div class="flex min-w-0 items-start gap-3">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                    [class.bg-green-100]="t.type==='success'" [class.text-status-delivered]="t.type==='success'"
                    [class.bg-red-100]="t.type==='error'" [class.text-status-urgent]="t.type==='error'"
                    [class.bg-amber-100]="t.type==='warning'" [class.text-status-in-transit]="t.type==='warning'"
                    [class.bg-primary-fixed]="t.type==='info'" [class.text-primary]="t.type==='info'">
                <span class="material-symbols-outlined text-[22px]" style="font-variation-settings:'FILL' 1,'wght' 600">{{ icono(t.type) }}</span>
              </span>
              <div class="min-w-0 pt-0.5">
                @if (t.producto) {
                  <p class="text-[16px] font-bold leading-tight tracking-tight text-deep">{{ t.message }}</p>
                } @else {
                  <p class="text-[16px] font-bold leading-tight tracking-tight text-deep">{{ TITULOS[t.type] }}</p>
                  <p class="mt-1 text-[15px] leading-snug text-on-surface-variant">{{ t.message }}</p>
                }
              </div>
            </div>
            <button type="button" class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface" aria-label="Cerrar aviso" (click)="toasts.dismiss(t.id)">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          @if (t.producto; as p) {
            <div class="mt-3.5 flex items-center gap-3.5 rounded-xl border border-separator-hairline-light bg-system-background p-2.5">
              <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-separator-hairline-light bg-white p-1.5">
                @if (p.imagenUrl) { <img imgFallback [src]="p.imagenUrl" [alt]="p.nombre" class="h-full w-full object-contain" /> }
                @else { <span class="material-symbols-outlined text-on-surface-variant">inventory_2</span> }
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate text-[11px] font-extrabold uppercase tracking-wider text-primary">{{ p.marca || 'Producto' }}</span>
                  <span class="shrink-0 rounded-full border border-separator-hairline-light bg-white px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">Cant: {{ p.cantidad }}</span>
                </div>
                <h4 class="mt-0.5 truncate text-[13px] font-bold">{{ p.nombre }}</h4>
                <div class="mt-1 flex flex-wrap items-baseline gap-x-2">
                  <span class="text-[15px] font-extrabold text-deep">\${{ p.precio | number:'1.2-2' }}</span>
                  @if (p.precioBase && p.precioBase > p.precio) {
                    <span class="text-[11px] text-on-surface-variant line-through">\${{ p.precioBase | number:'1.2-2' }}</span>
                    <span class="rounded bg-green-50 px-1.5 text-[11px] font-bold text-status-delivered">Ahorras \${{ (p.precioBase - p.precio) * p.cantidad | number:'1.2-2' }}</span>
                  }
                </div>
              </div>
            </div>
            <div class="mt-4 flex items-center gap-2.5">
              <a routerLink="/carrito" (click)="toasts.dismiss(t.id)" class="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-primary/25 transition-all hover:bg-deep">
                <span class="material-symbols-outlined text-[18px]">shopping_cart</span>
                <span>Ver carrito ({{ t.carrito }})</span>
                <span class="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5">chevron_right</span>
              </a>
              <button type="button" class="whitespace-nowrap rounded-xl border border-separator-hairline-light px-3 py-2.5 text-[13px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface" (click)="toasts.dismiss(t.id)">Seguir comprando</button>
            </div>
          }
        </div>
        <div class="h-1 w-full overflow-hidden bg-slate-100"><div class="toast-bar h-full rounded-full bg-gradient-to-r from-primary to-[#A66BEA]" [style.animation-duration.ms]="t.ms"></div></div>
      </div>
    }
  </div>
  `,
})
export class ToastContainerComponent {
  readonly TITULOS = TITULOS;
  constructor(public toasts: ToastService) {}
  icono(type: string) {
    return type === 'success' ? 'check_circle' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info';
  }
}
