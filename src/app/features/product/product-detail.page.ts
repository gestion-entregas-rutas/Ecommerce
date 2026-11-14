import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { Producto } from '../../core/models/api.models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div *ngIf="loading" class="surface-card p-10 text-center text-on-surface-variant">Cargando producto...</div>
  <div *ngIf="error" class="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 font-body-sm">{{error}}</div>

  <div *ngIf="producto" class="fade-in grid grid-cols-1 lg:grid-cols-12 gap-8">
    <section class="lg:col-span-7">
      <div class="surface-card p-6">
        <div class="grid grid-cols-[72px_1fr] gap-4">
          <div class="flex lg:flex-col gap-2 order-2 lg:order-1 overflow-auto">
            <button *ngFor="let m of mediaList()" class="h-16 w-16 shrink-0 rounded-lg border overflow-hidden bg-surface-container-low p-1" [class.border-primary]="selectedMedia===m" [class.border-separator-hairline-light]="selectedMedia!==m" (click)="selectedMedia=m">
              <img *ngIf="m.tipo!=='video'" [src]="m.url" class="h-full w-full object-contain" />
              <span *ngIf="m.tipo==='video'" class="material-symbols-outlined text-on-surface-variant">play_circle</span>
            </button>
          </div>
          <div class="order-1 lg:order-2 aspect-square bg-surface-container-low/40 rounded-xl flex items-center justify-center p-6">
            <img *ngIf="selectedMedia?.tipo!=='video'" [src]="selectedMedia?.url || producto.imagenPrincipalUrl" class="max-h-full max-w-full object-contain" />
            <video *ngIf="selectedMedia?.tipo==='video'" [src]="selectedMedia?.url" controls class="max-h-full max-w-full rounded-lg"></video>
          </div>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <details open class="surface-card p-5 group">
          <summary class="list-none cursor-pointer flex items-center justify-between font-title-md">Especificaciones técnicas <span class="material-symbols-outlined text-[20px] text-on-surface-variant group-open:rotate-180 transition-transform">expand_more</span></summary>
          <div class="mt-4 divide-y divide-separator-hairline-light">
            <div *ngFor="let f of (producto.fichaTecnica || [])" class="grid grid-cols-[1fr_1.4fr] gap-4 py-3 font-body-sm"><span class="text-on-surface-variant">{{f.clave}}</span><span>{{f.valor}}</span></div>
            <div *ngIf="!(producto.fichaTecnica?.length)" class="py-3 font-body-sm text-on-surface-variant">Sin especificaciones disponibles.</div>
          </div>
        </details>
        <details class="surface-card p-5 group">
          <summary class="list-none cursor-pointer flex items-center justify-between font-title-md">Dimensiones y detalles <span class="material-symbols-outlined text-[20px] text-on-surface-variant group-open:rotate-180 transition-transform">expand_more</span></summary>
          <ul class="mt-4 space-y-2 font-body-sm text-on-surface/90">
            <li *ngFor="let b of (producto.sobreEsteArticulo || [])" class="flex gap-2"><span class="text-primary">•</span><span>{{b}}</span></li>
            <li *ngIf="!(producto.sobreEsteArticulo?.length)" class="text-on-surface-variant">Información adicional no disponible.</li>
          </ul>
        </details>
      </div>
    </section>

    <aside class="lg:col-span-5 lg:sticky lg:top-20 self-start">
      <div class="surface-card p-6">
        <div class="font-body-sm text-primary font-semibold">{{producto.marca || producto.categoriaNombre}}</div>
        <h1 class="font-headline-md mt-1">{{producto.nombre}}</h1>
        <div class="mt-2 flex items-center gap-2 font-body-sm text-on-surface-variant"><span>⭐ {{producto.calificacionPromedio || 0}}</span><span>·</span><span>{{producto.totalResenas || 0}} reseñas</span></div>
        <div class="mt-4 flex items-baseline gap-2">
          <span class="font-headline-lg tabular-nums">\${{precioActual() | number:'1.2-2'}}</span>
          <span *ngIf="producto.precioOferta != null" class="font-body-md text-on-surface-variant line-through tabular-nums">\${{producto.precioBase | number:'1.2-2'}}</span>
        </div>
        <div class="mt-2 font-label-md" [ngClass]="producto.stock>0 ? 'text-status-delivered' : 'text-status-urgent'">
          {{ producto.stock>0 ? 'Disponible para entrega hoy en tu zona.' : 'Este producto acaba de agotarse mientras navegabas.' }}
        </div>

        <div class="mt-6">
          <div class="font-label-md mb-2">Modalidad de entrega</div>
          <div class="segmented-ios w-full grid grid-cols-2">
            <button type="button" [class.active]="deliveryMode==='Domicilio'" (click)="deliveryMode='Domicilio'">Envío a domicilio</button>
            <button type="button" [class.active]="deliveryMode==='RetiroTienda'" (click)="deliveryMode='RetiroTienda'">Retiro en tienda</button>
          </div>
          <div class="mt-3 surface-subtle p-4 font-body-sm">
            <ng-container *ngIf="deliveryMode==='Domicilio'; else retiro">
              <div class="flex gap-2"><span class="material-symbols-outlined text-[18px] text-primary">local_shipping</span><span>Disponible para entrega hoy en tu zona (confirmamos cobertura y tiempo estimado al finalizar tu compra).</span></div>
            </ng-container>
            <ng-template #retiro>
              <div class="flex gap-2"><span class="material-symbols-outlined text-[18px] text-status-delivered">store</span><span><strong>Retiro gratis disponible hoy en nuestro local.</strong><br>Universidad Técnica de Ambato / Hub Metropolitano. Disponibilidad inmediata sin costo de envío.</span></div>
            </ng-template>
          </div>
        </div>

        <div class="mt-5 flex items-end gap-3">
          <div>
            <label class="font-body-sm text-on-surface-variant block mb-1">Cantidad</label>
            <select class="input-field !w-24" [(ngModel)]="cantidad" [disabled]="producto.stock<=0">
              <option *ngFor="let n of qtyOptions()" [ngValue]="n">{{n}}</option>
            </select>
          </div>
          <div class="font-body-sm text-on-surface-variant pb-2 tabular-nums">Stock: {{producto.stock}}</div>
        </div>

        <div class="mt-5 grid gap-2">
          <button class="btn-primary w-full !py-3" [disabled]="producto.stock<=0" (click)="addToCart()">Agregar al carrito</button>
          <button class="btn-secondary-soft w-full !py-3" [disabled]="producto.stock<=0" (click)="buyNow()">Comprar ahora</button>
        </div>
        <div *ngIf="actionMsg" class="mt-3 font-body-sm text-status-delivered">{{actionMsg}}</div>
        <div *ngIf="actionErr" class="mt-3 font-body-sm text-status-urgent">{{actionErr}}</div>
      </div>

      <div class="surface-card p-6 mt-4">
        <h2 class="font-title-md">Reseñas</h2>
        <div *ngIf="!(producto.resenas?.length)" class="mt-2 font-body-sm text-on-surface-variant">Aún no hay reseñas.</div>
        <div *ngFor="let r of (producto.resenas || [])" class="mt-3 pt-3 border-t border-separator-hairline-light font-body-sm">
          <div class="font-label-md">{{r.clienteNombre || 'Cliente'}} · ⭐ {{r.calificacion}}</div>
          <div class="text-on-surface-variant mt-1">{{r.comentario}}</div>
        </div>
        <form *ngIf="auth.isCliente()" (ngSubmit)="submitReview()" class="mt-4 space-y-2">
          <select class="input-field" [(ngModel)]="review.calificacion" name="calificacion"><option *ngFor="let n of [5,4,3,2,1]" [ngValue]="n">{{n}} estrellas</option></select>
          <textarea class="input-field" rows="3" [(ngModel)]="review.comentario" name="comentario" placeholder="Comparte tu experiencia"></textarea>
          <button class="btn-ghost w-full">Publicar reseña</button>
          <div *ngIf="reviewMsg" class="font-body-sm text-status-delivered">{{reviewMsg}}</div>
          <div *ngIf="reviewErr" class="font-body-sm text-status-urgent">{{reviewErr}}</div>
        </form>
        <p *ngIf="!auth.isCliente()" class="mt-3 font-body-sm text-on-surface-variant">Inicia sesión para escribir una reseña.</p>
      </div>
    </aside>
  </div>
  `,
})
export class ProductDetailPage implements OnInit {
  producto?: Producto;
  loading = false; error = '';
  cantidad = 1; selectedMedia: any = null;
  deliveryMode: 'Domicilio' | 'RetiroTienda' = 'Domicilio';
  actionMsg = ''; actionErr = '';
  review = { calificacion: 5, comentario: '' };
  reviewMsg = ''; reviewErr = '';

  constructor(private route: ActivatedRoute, private router: Router, private catalog: CatalogService, private cart: CartService, public auth: AuthService) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const entrega = this.route.snapshot.queryParamMap.get('entrega');
    if (entrega === 'RetiroTienda' || entrega === 'Domicilio') this.deliveryMode = entrega;
    if (!id) { this.error = 'Producto no encontrado'; return; }
    this.loading = true;
    this.catalog.getProducto(id).subscribe({
      next: (p) => { this.producto = p; this.selectedMedia = this.mediaList()[0] || null; this.loading = false; },
      error: (e) => { this.error = e?.userMessage || 'No se pudo cargar el producto'; this.loading = false; },
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
    this.cart.addItem(this.producto.id, this.cantidad).subscribe({
      next: () => {
        this.actionMsg = 'Producto agregado al carrito. Tus productos se mantendrán guardados.';
        if (goCheckout) {
          const url = '/checkout';
          const extras = { queryParams: { entrega: this.deliveryMode } };
          if (this.auth.isAuthenticated() && this.auth.isCliente()) this.router.navigate([url], extras);
          else this.router.navigate(['/login'], { queryParams: { returnUrl: `/checkout?entrega=${this.deliveryMode}` } });
        }
      },
      error: (e) => this.actionErr = e?.userMessage || 'No pudimos agregar el producto en este momento.',
    });
  }
  buyNow() { this.addToCart(true); }
  submitReview() {
    if (!this.producto) return;
    this.reviewMsg = ''; this.reviewErr = '';
    this.catalog.crearResena(this.producto.id, this.review).subscribe({
      next: () => { this.reviewMsg = 'Reseña publicada. ¡Gracias por tu opinión!'; this.catalog.getProducto(this.producto!.id).subscribe({ next: (p)=> this.producto=p }); },
      error: (e) => this.reviewErr = e?.userMessage || e?.problem?.mensaje || 'No se pudo publicar tu reseña.',
    });
  }
}
