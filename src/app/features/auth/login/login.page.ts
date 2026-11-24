import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { FieldErrorComponent, FormValidator, required } from '../../../core/validation/form-rules';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf, FieldErrorComponent],
  template: `
  <div class="py-2 sm:py-6">
    <div class="mx-auto max-w-md surface-card">
      <div class="p-6 sm:p-8">
        <h1 class="page-title !text-[26px]">Iniciar sesión</h1>
        <p class="font-body-sm text-on-surface-variant mt-1">Usa tu usuario o correo para acceder.</p>

        <form (ngSubmit)="submit()" class="mt-6 space-y-4" novalidate>
          <div>
            <label class="field-label">Usuario o correo</label>
            <input class="input-field" [class.!border-red-500]="v.error(datos,'usuarioOCorreo')" [(ngModel)]="usuarioOCorreo" (blur)="v.tocar('usuarioOCorreo')" name="usuarioOCorreo" autocomplete="username" placeholder="ej. cliente@correo.com" required />
            <app-field-error [message]="v.error(datos,'usuarioOCorreo')" />
          </div>
          <div>
            <label class="field-label">Contraseña</label>
            <input class="input-field" [class.!border-red-500]="v.error(datos,'password')" [(ngModel)]="password" (blur)="v.tocar('password')" name="password" type="password" autocomplete="current-password" placeholder="Tu contraseña" required />
            <app-field-error [message]="v.error(datos,'password')" />
          </div>

          <div *ngIf="error()" class="rounded-xl border border-red-200 bg-red-50 p-3 font-body-sm text-red-700 flex gap-2">
            <span class="material-symbols-outlined text-[18px]">error</span><span>{{error()}}</span>
          </div>

          <button class="btn-primary w-full !py-3 !text-[15px]" [disabled]="loading()">
            <span *ngIf="loading()" class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
            {{loading() ? 'Ingresando...' : 'Ingresar'}}
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
  readonly loading = signal(false);
  readonly error = signal('');
  v = new FormValidator<{ usuarioOCorreo: string; password: string }>({
    usuarioOCorreo: required('Escribe tu usuario o correo.'),
    password: required('Escribe tu contraseña.'),
  });
  get datos() { return { usuarioOCorreo: this.usuarioOCorreo, password: this.password }; }
  returnUrl = '/';
  constructor(private auth: AuthService, private cart: CartService, private route: ActivatedRoute, private router: Router) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }
  submit() {
    if (!this.v.validar(this.datos)) return;
    this.loading.set(true); this.error.set('');
    this.auth.login({ usuarioOCorreo: this.usuarioOCorreo, password: this.password }).subscribe({
      next: () => {
        this.cart.mergeGuestCart().subscribe({
          next: () => this.router.navigateByUrl(this.returnUrl),
          error: () => this.router.navigateByUrl(this.returnUrl),
        });
      },
      error: (e: any) => { this.error.set(e?.status === 401 ? 'Usuario o contraseña incorrectos. Revisa tus datos e inténtalo de nuevo.' : (e?.userMessage || 'No pudimos iniciar sesión. Verifica tus datos.')); this.loading.set(false); },
    });
  }
}
