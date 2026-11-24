import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { FieldErrorComponent, FormValidator, claveNueva, correo, nombrePersona, telefono } from '../../../core/validation/form-rules';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf, FieldErrorComponent],
  template: `
  <div class="py-2 sm:py-6">
    <div class="mx-auto max-w-md surface-card">
      <div class="p-6 sm:p-8">
        <h1 class="page-title !text-[26px]">Crear cuenta</h1>
        <p class="font-body-sm text-on-surface-variant mt-1">Completa tus datos para comenzar.</p>

        <form (ngSubmit)="submit()" class="mt-6 space-y-4" novalidate>
          <div>
            <label class="field-label">Nombre completo</label>
            <input class="input-field" [class.!border-red-500]="v.error(form,'nombreCompleto')" [(ngModel)]="form.nombreCompleto" (blur)="v.tocar('nombreCompleto')" name="nombreCompleto" placeholder="Tu nombre" required />
            <app-field-error [message]="v.error(form,'nombreCompleto')" />
          </div>
          <div>
            <label class="field-label">Correo</label>
            <input class="input-field" [class.!border-red-500]="v.error(form,'correo')" [(ngModel)]="form.correo" (blur)="v.tocar('correo')" name="correo" type="email" autocomplete="email" placeholder="correo@ejemplo.com" required />
            <app-field-error [message]="v.error(form,'correo')" />
          </div>
          <div>
            <label class="field-label">Teléfono</label>
            <input class="input-field" [class.!border-red-500]="v.error(form,'telefono')" [(ngModel)]="form.telefono" (blur)="v.tocar('telefono')" name="telefono" placeholder="0999999999" required />
            <app-field-error [message]="v.error(form,'telefono')" />
          </div>
          <div>
            <label class="field-label">Contraseña</label>
            <input class="input-field" [class.!border-red-500]="v.error(form,'password')" [(ngModel)]="form.password" (blur)="v.tocar('password')" name="password" type="password" autocomplete="new-password" placeholder="Mínimo 12 caracteres" required />
            <app-field-error [message]="v.error(form,'password')" />
          </div>

          <div *ngIf="error()" class="rounded-xl border border-red-200 bg-red-50 p-3 font-body-sm text-red-700 flex gap-2">
            <span class="material-symbols-outlined text-[18px]">error</span><span>{{error()}}</span>
          </div>

          <button class="btn-primary w-full !py-3 !text-[15px]" [disabled]="loading()">{{loading()?'Creando cuenta...':'Crear cuenta'}}</button>
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
  v = new FormValidator<typeof this.form>({
    nombreCompleto: nombrePersona('El nombre'),
    correo,
    telefono,
    password: claveNueva,
  });
  readonly loading = signal(false); readonly error = signal(''); returnUrl = '/';
  constructor(private auth: AuthService, private cart: CartService, private route: ActivatedRoute, private router: Router) {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }
  submit() {
    if (!this.v.validar(this.form)) return;
    this.loading.set(true); this.error.set('');
    this.auth.registroCliente(this.form).subscribe({
      next: () => {
        this.cart.mergeGuestCart().subscribe({
          next: () => this.router.navigateByUrl(this.returnUrl),
          error: () => this.router.navigateByUrl(this.returnUrl),
        });
      },
      error: (e: any) => { this.error.set(e?.userMessage || 'No pudimos crear tu cuenta.'); this.loading.set(false); },
    });
  }
}
