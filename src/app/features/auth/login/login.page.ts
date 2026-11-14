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
    <div class="mx-auto grid max-w-5xl overflow-hidden surface-card lg:grid-cols-[1fr_420px]">
      <div class="hidden lg:flex flex-col justify-between bg-primary text-on-primary p-10">
        <div>
          <a routerLink="/" class="inline-flex items-center gap-2 font-title-md"><span class="material-symbols-outlined">storefront</span> Tienda</a>
          <h1 class="font-headline-lg mt-10">Bienvenido de nuevo</h1>
          <p class="mt-3 text-white/85 font-body-md">Ingresa para continuar tu compra, revisar tus pedidos y mantener tu carrito sincronizado.</p>
        </div>
        <ul class="space-y-3 font-body-sm text-white/90">
          <li class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">check_circle</span> Compra más rápido con tu cuenta</li>
          <li class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">check_circle</span> Seguimiento de pedidos en tiempo real</li>
          <li class="flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">check_circle</span> Tus productos de invitado se conservan al iniciar sesión</li>
        </ul>
      </div>

      <div class="p-6 sm:p-10 bg-surface-container-lowest">
        <div class="lg:hidden mb-6">
          <a routerLink="/" class="inline-flex items-center gap-2 font-title-md text-primary"><span class="material-symbols-outlined">storefront</span> Tienda</a>
        </div>
        <h2 class="font-headline-md">Iniciar sesión</h2>
        <p class="font-body-sm text-on-surface-variant mt-1">Usa tu usuario o correo para acceder.</p>

        <form (ngSubmit)="submit()" class="mt-6 space-y-4">
          <div>
            <label class="font-label-md block mb-1.5">Usuario o correo</label>
            <input class="input-field" [(ngModel)]="usuarioOCorreo" name="usuarioOCorreo" autocomplete="username" placeholder="ej. cliente@correo.com" required />
          </div>
          <div>
            <label class="font-label-md block mb-1.5">Contraseña</label>
            <input class="input-field" [(ngModel)]="password" name="password" type="password" autocomplete="current-password" placeholder="Tu contraseña" required />
          </div>

          <div *ngIf="error" class="rounded-xl border border-red-200 bg-red-50 p-3 font-body-sm text-red-700 flex gap-2">
            <span class="material-symbols-outlined text-[18px]">error</span><span>{{error}}</span>
          </div>

          <button class="btn-primary w-full !py-3 !text-[15px]" [disabled]="loading || !usuarioOCorreo || !password">
            <span *ngIf="loading" class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            {{loading ? 'Ingresando...' : 'Ingresar'}}
          </button>
        </form>

        <div class="mt-6 border-t border-separator-hairline-light pt-5">
          <p class="font-body-sm text-on-surface-variant">¿No tienes cuenta?
            <a class="text-primary font-label-md hover:underline" [routerLink]="['/registro']" [queryParams]="{returnUrl}">Crea una aquí</a>
          </p>
          <p *ngIf="returnUrl && returnUrl !== '/'" class="font-body-sm text-on-surface-variant mt-2">Al iniciar sesión volverás a: <span class="font-label-md">{{returnUrl}}</span></p>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class LoginPage {
  usuarioOCorreo = '';
  password = '';
  loading = false;
  error = '';
  returnUrl = '/';
  constructor(private auth: AuthService, private cart: CartService, private route: ActivatedRoute, private router: Router) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }
  submit() {
    this.loading = true; this.error = '';
    this.auth.login({ usuarioOCorreo: this.usuarioOCorreo, password: this.password }).subscribe({
      next: () => {
        this.cart.mergeGuestCart().subscribe({
          next: () => this.router.navigateByUrl(this.returnUrl),
          error: () => this.router.navigateByUrl(this.returnUrl),
        });
      },
      error: (e: any) => { this.error = e?.userMessage || 'No pudimos iniciar sesión. Verifica tus datos.'; this.loading = false; },
    });
  }
}
