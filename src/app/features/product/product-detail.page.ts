import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ImgFallbackDirective } from '../../core/ui/img-fallback.directive';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { Producto } from '../../core/models/api.models';
import { BackLinkComponent } from '../../core/ui/back-link.component';
import { ToastService } from '../../core/services/toast.service';
import { CoverageService } from '../../core/services/coverage.service';
import { FieldErrorComponent, FormValidator, compose, maxLen, minLen, required } from '../../core/validation/form-rules';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, FieldErrorComponent, BackLinkComponent, ImgFallbackDirective],
  template: `
  <div *ngIf="loading" class="surface-card p-10 text-center text-on-surface-variant">Cargando producto…</div>
  <div *ngIf="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 font-body-sm" role="alert">{{error}}</div>

  <div *ngIf="producto">
    <app-back-link fallback="/productos" label="Volver a productos" />
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
      <section aria-label="Imágenes del producto" class="grid grid-cols-1 gap-3 sm:grid-cols-[72px_1fr] sm:items-start">
        <div class="order-2 flex gap-2 overflow-auto sm:order-1 sm:flex-col">
          <button *ngFor="let m of mediaList()" type="button" class="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl border-2 bg-surface-container-lowest p-1" [class.border-primary]="selectedMedia===m" [class.border-separator-hairline-light]="selectedMedia!==m" (click)="selectedMedia=m" aria-label="Ver imagen">
            <img imgFallback *ngIf="m.tipo!=='video'" [src]="m.url" alt="" class="h-full w-full object-contain" />
            <span *ngIf="m.tipo==='video'" class="material-symbols-outlined text-on-surface-variant">play_circle</span>
          </button>
        </div>
        <div class="surface-card order-1 flex aspect-square items-center justify-center p-8 sm:order-2">
          <img imgFallback *ngIf="selectedMedia?.tipo!=='video'" [src]="selectedMedia?.url || producto.imagenPrincipalUrl" [alt]="producto.nombre" class="max-h-full max-w-full object-contain" />
          <video *ngIf="selectedMedia?.tipo==='video'" [src]="selectedMedia?.url" controls class="max-h-full max-w-full rounded-lg"></video>
        </div>
      </section>

      <section aria-label="Compra" class="lg:sticky lg:top-24 lg:self-start">
        <div class="font-label-md text-primary">{{producto.marca || producto.categoriaNombre}}</div>
        <h1 class="page-title mt-1">{{producto.nombre}}</h1>
        <div class="mt-2 flex items-center gap-1.5 font-body-sm text-on-surface-variant">
          <span class="material-symbols-outlined text-[18px] text-status-in-transit" style="font-variation-settings:'FILL' 1">star</span>
          <strong class="text-on-surface">{{producto.calificacionPromedio || 0}}</strong>
          <span>({{producto.totalResenas || 0}} reseñas)</span>
        </div>

        <div class="mt-5 flex items-baseline gap-3">
          <span class="price text-[40px] leading-none">\${{precioActual() | number:'1.2-2'}}</span>
          <span *ngIf="producto.precioOferta != null" class="text-[18px] text-on-surface-variant line-through tabular-nums">\${{producto.precioBase | number:'1.2-2'}}</span>
        </div>
        <p class="mt-2 font-label-md" [ngClass]="producto.stock>0 ? 'text-status-delivered' : 'text-status-urgent'">
          {{ producto.stock>5 ? 'Disponible · ' + producto.stock + ' en stock' : producto.stock>0 ? 'Últimas ' + producto.stock + ' unidades' : 'Este producto se agotó' }}
        </p>

        <div class="surface-card mt-6 p-5">
          <span class="field-label">Cómo lo recibes</span>
          <div class="segmented-ios grid w-full grid-cols-2">
            <button type="button" [class.active]="deliveryMode==='Domicilio'" (click)="deliveryMode='Domicilio'">A domicilio</button>
            <button type="button" [class.active]="deliveryMode==='RetiroTienda'" (click)="deliveryMode='RetiroTienda'">Retiro en tienda</button>
          </div>

          <div class="mt-4 flex items-start gap-3 font-body-sm" aria-live="polite">
            <ng-container *ngIf="deliveryMode==='Domicilio'; else retiro">
              <span class="material-symbols-outlined text-[22px]" [ngClass]="cov.estado()==='cubierta' ? 'text-status-delivered' : cov.estado()==='fuera' ? 'text-status-urgent' : 'text-primary'">local_shipping</span>
              <div class="flex-1">
                <ng-container [ngSwitch]="cov.estado()">
                  <p *ngSwitchCase="'cubierta'"><strong>Llega hoy a {{cov.zona()?.nombre}}</strong><br><span class="text-on-surface-variant">Confirmamos hora y costo al pagar.</span></p>
                  <p *ngSwitchCase="'fuera'"><strong>Aún no entregamos en tu ubicación</strong><br><span class="text-on-surface-variant">Cambia el punto en el mapa o elige retiro en tienda.</span></p>
                  <p *ngSwitchDefault><strong>Elige tu ubicación</strong><br><span class="text-on-surface-variant">Así sabes si te llega hoy antes de pagar.</span></p>
                </ng-container>
                <button type="button" class="mt-1 font-label-md text-primary hover:underline" (click)="cov.abrirSelector()">{{ cov.estado()==='sin-ubicacion' ? 'Elegir ubicación' : 'Cambiar ubicación' }}</button>
              </div>
            </ng-container>
            <ng-template #retiro>
              <span class="material-symbols-outlined text-[22px] text-status-delivered">store</span>
              <p><strong>Retiro gratis hoy</strong><br><span class="text-on-surface-variant">Universidad Técnica de Ambato / Hub Metropolitano. Sin costo de envío.</span></p>
            </ng-template>
          </div>

          <div class="mt-5 flex items-end gap-3 border-t border-separator-hairline-light pt-5">
            <div>
              <label class="field-label" for="cantidad">Cantidad</label>
              <select id="cantidad" class="input-field !w-24" [(ngModel)]="cantidad" [disabled]="producto.stock<=0">
                <option *ngFor="let n of qtyOptions()" [ngValue]="n">{{n}}</option>
              </select>
            </div>
            <button class="btn-primary flex-1" [disabled]="producto.stock<=0" (click)="addToCart()">Agregar al carrito</button>
          </div>
          <button class="btn-secondary-soft mt-2 w-full" [disabled]="producto.stock<=0" (click)="buyNow()">Comprar ahora</button>
          <div *ngIf="actionErr" class="mt-3 font-body-sm text-status-urgent" role="alert">{{actionErr}}</div>
        </div>
      </section>
    </div>

    <div class="mt-12 grid grid-cols-1 gap-8 border-t border-separator-hairline-light pt-10 lg:grid-cols-2 lg:gap-12">
      <section aria-labelledby="h-specs">
        <h2 id="h-specs" class="font-title-md">Detalles del producto</h2>
        <div class="surface-card mt-4 divide-y divide-separator-hairline-light px-5">
          <div *ngFor="let f of (producto.fichaTecnica || [])" class="grid grid-cols-[1fr_1.4fr] gap-4 py-3 font-body-sm"><span class="text-on-surface-variant">{{f.clave}}</span><span>{{f.valor}}</span></div>
          <div *ngIf="!(producto.fichaTecnica?.length)" class="py-3 font-body-sm text-on-surface-variant">Sin especificaciones disponibles.</div>
        </div>
        <ul *ngIf="producto.sobreEsteArticulo?.length" class="mt-5 space-y-2 font-body-sm">
          <li *ngFor="let b of producto.sobreEsteArticulo" class="flex gap-2"><span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span><span>{{b}}</span></li>
        </ul>
      </section>

      <section aria-labelledby="h-resenas">
        <h2 id="h-resenas" class="font-title-md">Reseñas</h2>
        <div class="surface-card mt-4 p-5">
          <div *ngIf="!(producto.resenas?.length)" class="font-body-sm text-on-surface-variant">Aún no hay reseñas. Sé la primera persona en opinar.</div>
          <div *ngFor="let r of (producto.resenas || []); let first = first" class="font-body-sm" [class.mt-4]="!first" [class.pt-4]="!first" [class.border-t]="!first" [class.border-separator-hairline-light]="!first">
            <div class="flex items-center gap-1.5 font-label-md">{{r.clienteNombre || 'Cliente'}}<span class="material-symbols-outlined text-[16px] text-status-in-transit" style="font-variation-settings:'FILL' 1">star</span>{{r.calificacion}}</div>
            <div class="mt-1 text-on-surface-variant">{{r.comentario}}</div>
          </div>
        </div>

        <form *ngIf="auth.isCliente()" (ngSubmit)="submitReview()" class="surface-card mt-4 space-y-3 p-5" novalidate>
          <h3 class="font-label-md">Escribe tu reseña</h3>
          <div>
            <label class="field-label" for="calificacion">Calificación</label>
            <select id="calificacion" class="input-field" [(ngModel)]="review.calificacion" name="calificacion"><option *ngFor="let n of [5,4,3,2,1]" [ngValue]="n">{{n}} {{ n===1 ? 'estrella' : 'estrellas' }}</option></select>
          </div>
          <div>
            <label class="field-label" for="comentario">Comentario</label>
            <textarea id="comentario" class="input-field" [class.!border-red-500]="vReview.error(review,'comentario')" rows="3" [(ngModel)]="review.comentario" (blur)="vReview.tocar('comentario')" name="comentario" placeholder="Cuéntanos qué tal te pareció"></textarea>
            <app-field-error [message]="vReview.error(review,'comentario')" />
          </div>
          <button class="btn-primary w-full">Publicar reseña</button>
          <div *ngIf="reviewErr" class="font-body-sm text-status-urgent" role="alert">{{reviewErr}}</div>
        </form>
        <p *ngIf="!auth.isCliente()" class="mt-4 font-body-sm text-on-surface-variant">Inicia sesión para escribir una reseña.</p>
      </section>
    </div>
  </div>
  `,
})
export class ProductDetailPage implements OnInit {
  private readonly toast = inject(ToastService);
  readonly cov = inject(CoverageService);
  producto?: Producto;
  loading = false; error = '';
  cantidad = 1; selectedMedia: any = null;
  deliveryMode: 'Domicilio' | 'RetiroTienda' = 'Domicilio';
  actionMsg = ''; actionErr = '';
  review = { calificacion: 5, comentario: '' };
  vReview = new FormValidator<typeof this.review>({
    calificacion: (v) => (v >= 1 && v <= 5 ? null : 'Elige una calificación de 1 a 5 estrellas.'),
    comentario: compose(required('Escribe un comentario sobre el producto.'), minLen(10, 'Cuéntanos un poco más (mínimo 10 caracteres).'), maxLen(500, 'El comentario no puede superar los 500 caracteres.')),
  });
  reviewMsg = ''; reviewErr = '';

  constructor(private route: ActivatedRoute, private router: Router, private catalog: CatalogService, private cart: CartService, public auth: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const entrega = this.route.snapshot.queryParamMap.get('entrega');
    if (entrega === 'RetiroTienda' || entrega === 'Domicilio') this.deliveryMode = entrega;
    if (!id) { this.error = 'Producto no encontrado'; return; }
    this.loading = true;
    this.catalog.getProducto(id).subscribe({
      next: (p) => { this.producto = p; this.selectedMedia = this.mediaList()[0] || null; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { this.error = e?.userMessage || 'No se pudo cargar el producto'; this.loading = false; this.cdr.markForCheck(); },
    });
  }

  mediaList() {
    if (!this.producto) return [];
    const list = [...(this.producto.galeriaMultimedia || [])];
    if (this.producto.imagenPrincipalUrl && !list.some(m => m.url === this.producto!.imagenPrincipalUrl)) {
      list.unshift({ tipo: 'imagen', url: this.producto.imagenPrincipalUrl, orden: 0 });
    }
    return list.sort((a,b)=>(a.orden??0)-(b.orden??0));
  }
  precioActual() { return this.producto ? (this.producto.precioOferta ?? this.producto.precioBase) : 0; }
  qtyOptions() { const max = Math.max(1, Math.min(10, this.producto?.stock ?? 1)); return Array.from({length: max}, (_,i)=>i+1); }
  addToCart(goCheckout = false) {
    if (!this.producto) return;
    this.actionMsg = ''; this.actionErr = '';
    this.cart.addItem(this.producto.id, this.cantidad, { nombre: this.producto.nombre, marca: this.producto.marca || this.producto.categoriaNombre, imagenUrl: this.producto.imagenPrincipalUrl, precio: this.precioActual(), precioBase: this.producto.precioOferta != null ? this.producto.precioBase : null }).subscribe({
      next: () => {
        this.actionMsg = 'Producto agregado al carrito. Tus productos se mantendrán guardados.';
        if (goCheckout) {
          const url = '/checkout';
          const extras = { queryParams: { entrega: this.deliveryMode } };
          if (this.auth.isAuthenticated() && this.auth.isCliente()) this.router.navigate([url], extras);
          else this.router.navigate(['/login'], { queryParams: { returnUrl: `/checkout?entrega=${this.deliveryMode}` } });
        }
      },
      error: (e) => { this.actionErr = e?.userMessage || 'No pudimos agregar el producto en este momento.'; this.toast.error(this.actionErr); },
    });
  }
  buyNow() { this.addToCart(true); }
  submitReview() {
    if (!this.producto) return;
    if (!this.vReview.validar(this.review)) return;
    this.reviewMsg = ''; this.reviewErr = '';
    this.catalog.crearResena(this.producto.id, this.review).subscribe({
      next: () => { this.reviewMsg = 'Reseña publicada. ¡Gracias por tu opinión!'; this.toast.success('Reseña publicada correctamente. ¡Gracias por tu opinión!'); this.review = { ...this.review, comentario: '' }; this.vReview.reiniciar(); this.catalog.getProducto(this.producto!.id).subscribe({ next: (p)=> this.producto=p }); },
      error: (e) => { this.reviewErr = e?.userMessage || e?.problem?.mensaje || 'No se pudo publicar tu reseña.'; this.toast.error(this.reviewErr); },
    });
  }
}
