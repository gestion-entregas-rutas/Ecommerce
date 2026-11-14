import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf],
  template: `
  <div class="fade-in py-4 sm:py-8">
    <div class="mx-auto grid max-w-5xl overflow-hidden surface-card lg:grid-cols-[1fr_460px]">
      <div class="hidden lg:flex flex-col justify-between bg-surface-container-low p-10 border-r border-separator-hairline-light">
        <div>
          <a routerLink="/" class="inline-flex items-center gap-2 font-title-md text-primary"><span class="material-symbols-outlined">storefront</span> Tienda</a>
          <h1 class="font-headline-lg mt-10">Crea tu cuenta</h1>
          <p class="mt-3 text-on-surface-variant font-body-md">Regístrate en minutos para comprar, hacer seguimiento a tus pedidos y guardar tu carrito.</p>
        </div>
        <ul class="space-y-3 font-body-sm text-on-surface-variant">
          <li class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px] text-status-delivered">check_circle</span> Historial y seguimiento de compras</li>
          <li class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px] text-status-delivered">check_circle</span> Checkout más ágil</li>
          <li class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px] text-status-delivered">check_circle</span> Tu carrito de invitado se une a tu cuenta</li>
        </ul>
      </div>

      <div class="p-6 sm:p-10 bg-surface-container-lowest">
        <div class="lg:hidden mb-6">
          <a routerLink="/" class="inline-flex items-center gap-2 font-title-md text-primary"><span class="material-symbols-outlined">storefront</span> Tienda</a>
        </div>
        <h2 class="font-headline-md">Crear cuenta</h2>
        <p class="font-body-sm text-on-surface-variant mt-1">Completa tus datos para comenzar.</p>

        <form (ngSubmit)="submit()" class="mt-6 space-y-4">
          <div>
            <label class="font-label-md block mb-1.5">Nombre completo</label>
            <input class="input-field" [(ngModel)]="form.nombreCompleto" name="nombreCompleto" placeholder="Tu nombre" required />
          </div>
          <div>
            <label class="font-label-md block mb-1.5">Correo</label>
            <input class="input-field" [(ngModel)]="form.correo" name="correo" type="email" autocomplete="email" placeholder="correo@ejemplo.com" required />
          </div>
          <div>
            <label class="font-label-md block mb-1.5">Teléfono</label>
            <input class="input-field" [(ngModel)]="form.telefono" name="telefono" placeholder="0999999999" required />
          </div>
          <div>
            <label class="font-label-md block mb-1.5">Contraseña</label>
            <input class="input-field" [(ngModel)]="form.password" name="password" type="password" autocomplete="new-password" placeholder="Crea una contraseña" required />
          </div>

          <div *ngIf="error" class="rounded-xl border border-red-200 bg-red-50 p-3 font-body-sm text-red-700 flex gap-2">
            <span class="material-symbols-outlined text-[18px]">error</span><span>{{error}}</span>
          </div>

          <button class="btn-primary w-full !py-3 !text-[15px]" [disabled]="loading">{{loading?'Creando cuenta...':'Crear cuenta'}}</button>
        </form>

        <p class="mt-6 font-body-sm text-on-surface-variant">¿Ya tienes cuenta?
          <a class="text-primary font-label-md hover:underline" [routerLink]="['/login']" [queryParams]="{returnUrl}">Inicia sesión</a>
        </p>
      </div>
    </div>
  </div>
  `,
})
export class RegistroPage {
  form = { nombreCompleto: '', correo: '', telefono: '', password: '' };
  loading = false; error = ''; returnUrl = '/';
  constructor(private auth: AuthService, private cart: CartService, private route: ActivatedRoute, private router: Router) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }
  submit() {
    this.loading = true; this.error = '';
    this.auth.registroCliente(this.form).subscribe({
      next: () => {
        this.cart.mergeGuestCart().subscribe({
          next: () => this.router.navigateByUrl(this.returnUrl),
          error: () => this.router.navigateByUrl(this.returnUrl),
        });
      },
      error: (e: any) => { this.error = e?.userMessage || 'No pudimos crear tu cuenta.'; this.loading = false; },
    });
  }
}
