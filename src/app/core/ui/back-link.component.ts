import { Component, Injectable, Input, inject } from '@angular/core';
import { Location } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';

/** Cuenta las navegaciones dentro de la tienda para saber si "Volver" tiene a dónde regresar. */
@Injectable({ providedIn: 'root' })
export class NavTracker {
  count = 0;
  constructor() {
    inject(Router).events.subscribe((e) => { if (e instanceof NavigationEnd) this.count++; });
  }
}

/** Botón para regresar a la pantalla anterior (o a una ruta de respaldo si se entró directo). */
@Component({
  standalone: true,
  selector: 'app-back-link',
  template: `
    <button type="button" (click)="volver()" class="mb-3 inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 font-label-md text-on-surface-variant hover:text-primary">
      <span class="material-symbols-outlined text-[20px]">arrow_back</span>{{ label }}
    </button>
  `,
})
export class BackLinkComponent {
  @Input() fallback = '/productos';
  @Input() label = 'Volver';
  private readonly tracker = inject(NavTracker);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  volver() {
    if (this.tracker.count > 1) this.location.back();
    else this.router.navigateByUrl(this.fallback);
  }
}
