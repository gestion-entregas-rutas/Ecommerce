import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, catchError, map, of, switchMap, takeUntil, timer } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { Categoria, Producto } from '../../core/models/api.models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <section class="fade-in">
    <div class="mb-6">
      <nav class="font-body-sm text-on-surface-variant mb-2">
        <a routerLink="/" class="hover:text-primary">Inicio</a><span class="mx-1.5">/</span><span>{{ breadcrumbLabel() }}</span>
      </nav>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="font-headline-lg">{{ pageTitle() }}</h1>
          <p class="font-body-sm text-on-surface-variant mt-1">Encuentra lo que buscas y filtra por precio, categoría u ofertas.</p>
        </div>
        <form class="w-full lg:max-w-xl" (ngSubmit)="submitSearch()">
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">search</span>
            <input class="input-field !pl-11 !pr-24 !py-3 bg-surface-container-lowest" [ngModel]="searchDraft" (ngModelChange)="onSearchInput($event)" name="searchDraft" placeholder="Buscar por nombre, marca o categoría" />
            <button *ngIf="searchDraft" type="button" class="absolute right-[88px] top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface" (click)="clearSearch()"><span class="material-symbols-outlined text-[18px]">close</span></button>
            <button type="submit" class="absolute right-1.5 top-1/2 -translate-y-1/2 btn-primary !py-2 !px-4">Buscar</button>
          </div>
          <p class="font-body-sm text-on-surface-variant mt-1.5">La búsqueda se actualiza automáticamente mientras escribes.</p>
        </form>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
      <aside class="surface-card p-5 lg:sticky lg:top-20 border-t-4 border-t-primary">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-title-md flex items-center gap-2"><span class="material-symbols-outlined text-primary">tune</span>Filtros</h2>
          <button type="button" class="font-label-md text-primary hover:underline" (click)="resetFilters()">Limpiar</button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="font-label-md block mb-1.5">Categoría</label>
            <select class="input-field" [ngModel]="filters.categoriaId" (ngModelChange)="setCategoria($event)">
              <option [ngValue]="null">Todas las categorías</option>
              @for (c of categorias; track c.id) { <option [ngValue]="c.id">{{c.nombre}}</option> }
            </select>
          </div>

          <div>
            <label class="font-label-md block mb-1.5">Rango de precio</label>
            <div class="grid grid-cols-2 gap-2">
              <input type="number" min="0" class="input-field" placeholder="Mín" [ngModel]="filters.precioMin" (ngModelChange)="setPrecioMin($event)" />
              <input type="number" min="0" class="input-field" placeholder="Máx" [ngModel]="filters.precioMax" (ngModelChange)="setPrecioMax($event)" />
            </div>
            <p class="font-body-sm text-on-surface-variant mt-1">Se aplica automáticamente al escribir.</p>
          </div>

          <label class="flex items-center gap-2 font-body-sm cursor-pointer select-none">
            <input type="checkbox" class="h-4 w-4 accent-primary" [ngModel]="filters.soloOfertas" (ngModelChange)="toggleOfertas($event)" />
            Solo ofertas
          </label>

          <div>
            <label class="font-label-md block mb-1.5">Ordenar por</label>
            <select class="input-field" [ngModel]="filters.orden" (ngModelChange)="setOrden($event)">
              <option value="relevancia">Más relevantes</option>
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
              <option value="calificacion">Mejor calificados</option>
            </select>
          </div>
        </div>
      </aside>

      <div>
        <div class="surface-card p-4 mb-4 flex flex-wrap items-center gap-2" role="status" aria-live="polite">
          <span *ngIf="loading" class="material-symbols-outlined animate-spin text-primary text-[20px]" aria-hidden="true">progress_activity</span>
          <span class="font-body-sm text-on-surface-variant tabular-nums">{{ loading ? 'Buscando...' : error ? 'No se pudieron cargar los resultados' : (total + ' resultados') }}</span>
          <button *ngIf="filters.buscar" class="chip badge-soft-blue" (click)="clearSearch()">Búsqueda: {{filters.buscar}} <span class="material-symbols-outlined text-[14px]">close</span></button>
          <button *ngIf="filters.categoriaId" class="chip badge-soft-blue" (click)="setCategoria(null)">{{ categoryLabel() }} <span class="material-symbols-outlined text-[14px]">close</span></button>
          <button *ngIf="filters.soloOfertas" class="chip badge-soft-blue" (click)="toggleOfertas(false)">Ofertas <span class="material-symbols-outlined text-[14px]">close</span></button>
          <div class="ml-auto flex items-center gap-2 lg:hidden">
            <select class="input-field !w-auto !py-1.5 !text-[13px]" [ngModel]="filters.orden" (ngModelChange)="setOrden($event)">
              <option value="relevancia">Relevancia</option>
              <option value="precio_asc">Menor precio</option>
              <option value="precio_desc">Mayor precio</option>
              <option value="calificacion">Calificación</option>
            </select>
          </div>
        </div>

        <div *ngIf="error" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 font-body-sm flex items-start justify-between gap-3">
          <span>{{error}}</span>
          <button class="font-label-md underline" (click)="retry()">Reintentar</button>
        </div>

        <div *ngIf="loading && productos.length === 0" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          @for (s of skeletons; track s) {
            <div class="surface-card p-4 animate-pulse">
              <div class="aspect-[4/3] rounded-lg bg-surface-container-low mb-4"></div>
              <div class="h-4 bg-surface-container-low rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-surface-container-low rounded w-1/2 mb-3"></div>
              <div class="h-6 bg-surface-container-low rounded w-1/3"></div>
            </div>
          }
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 transition-opacity" [class.opacity-50]="loading" [attr.aria-busy]="loading" [attr.inert]="loading ? '' : null">
          @for (p of productos; track p.id) {
            <article class="surface-card p-4 hover:shadow-md transition-all duration-200 flex flex-col h-full">
              <a [routerLink]="['/producto', p.id]" class="relative block">
                <div class="absolute left-2 top-2 z-10 flex flex-col gap-1.5">
                  <span *ngIf="p.precioOferta != null" class="chip badge-soft-blue !text-[12px]">Oferta</span>
                  <span *ngIf="p.stock>0 && p.stock<=5" class="chip badge-orange !text-[12px]">Últimas {{p.stock}}</span>
                  <span *ngIf="p.stock<=0" class="chip badge-red !text-[12px]">Agotado</span>
                </div>
                <div class="aspect-[4/3] rounded-lg bg-surface-container-low/50 flex items-center justify-center p-4 mb-3 overflow-hidden">
                  <img *ngIf="p.imagenPrincipalUrl" [src]="p.imagenPrincipalUrl" [alt]="p.nombre" loading="lazy" decoding="async" class="max-h-full max-w-full object-contain" />
                  <span *ngIf="!p.imagenPrincipalUrl" class="material-symbols-outlined text-[32px] text-on-surface-variant/40">image</span>
                </div>
              </a>
              <a [routerLink]="['/producto', p.id]" class="font-title-md hover:text-primary transition-colors line-clamp-2 min-h-[44px]">{{p.nombre}}</a>
              <div class="font-body-sm text-on-surface-variant mt-1">{{p.marca || p.categoriaNombre || 'Producto'}}</div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="font-headline-md tabular-nums">\${{precioActual(p) | number:'1.2-2'}}</span>
                <span *ngIf="p.precioOferta != null" class="font-body-sm text-on-surface-variant line-through tabular-nums">\${{p.precioBase | number:'1.2-2'}}</span>
              </div>
              <div class="mt-1 font-body-sm" [ngClass]="p.stock>0 ? 'text-status-delivered' : 'text-status-urgent'">
                {{ p.stock>0 ? 'Disponible' : 'Agotado' }}
              </div>
              <div class="mt-auto pt-4 flex gap-2">
                <a [routerLink]="['/producto', p.id]" class="btn-ghost flex-1 !py-2">Ver detalle</a>
                <button class="btn-primary flex-1 !py-2" [disabled]="p.stock<=0" (click)="add(p)">Agregar</button>
              </div>
            </article>
          }
        </div>

        <div *ngIf="!loading && productos.length===0 && !error" class="surface-card p-10 text-center">
          <span class="material-symbols-outlined text-[40px] text-on-surface-variant/40">search_off</span>
          <p class="font-title-md mt-3">No encontramos productos</p>
          <p class="font-body-sm text-on-surface-variant mt-1">Prueba con otros términos o ajusta los filtros.</p>
          <button class="btn-ghost mt-4" (click)="resetFilters()">Limpiar filtros</button>
        </div>

        <div *ngIf="!loading && total>tamanoPagina" class="mt-8 flex items-center justify-center gap-3">
          <button class="btn-ghost !py-2" [disabled]="pagina<=1" (click)="changePage(pagina-1)">Anterior</button>
          <span class="font-body-sm text-on-surface-variant tabular-nums">Página {{pagina}} de {{totalPaginas}}</span>
          <button class="btn-ghost !py-2" [disabled]="pagina>=totalPaginas" (click)="changePage(pagina+1)">Siguiente</button>
        </div>
      </div>
    </div>
  </section>
  `,
})
export class CatalogPage implements OnInit, OnDestroy {
  private readonly categoriesState = signal<Categoria[]>([]);
  private readonly productsState = signal<Producto[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');
  get categorias() { return this.categoriesState(); }
  set categorias(value: Categoria[]) { this.categoriesState.set(value); }
  get productos() { return this.productsState(); }
  set productos(value: Producto[]) { this.productsState.set(value); }
  get loading() { return this.loadingState(); }
  set loading(value: boolean) { this.loadingState.set(value); }
  get error() { return this.errorState(); }
  set error(value: string) { this.errorState.set(value); }
  pagina = 1; tamanoPagina = 12; total = 0;
  filters: any = { categoriaId: null, buscar: '', soloOfertas: false, precioMin: null, precioMax: null, orden: 'relevancia' };
  searchDraft = '';
  readonly skeletons = [1,2,3,4,5,6];

  private query$ = new Subject<any>();
  private search$ = new Subject<string>();
  private price$ = new Subject<void>();
  private sub = new Subscription();
  private lastParams: any = null;
  private cancelDraft$ = new Subject<void>();
  private lastQueryKey = '';

  constructor(private catalog: CatalogService, private cart: CartService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.sub.add(this.catalog.getCategorias().subscribe({ next: (c: Categoria[]) => this.categorias = c || [], error: () => {} }));

    this.sub.add(
      this.query$.pipe(
        map((params) => {
          this.lastParams = params;
          this.loading = true; this.error = '';
          return params;
        }),
        switchMap((params) => this.catalog.getProductos(params).pipe(
          catchError((e) => of({ __error: e })),
        )),
      ).subscribe((res: any) => {
        if (res?.__error) {
          const e = res.__error;
          this.error = e?.name === 'TimeoutError' ? 'La carga está tardando demasiado. Verifica tu conexión o inténtalo de nuevo.' : (e?.userMessage || 'No pudimos cargar los productos.');
          this.productos = []; this.total = 0; this.loading = false;
          return;
        }
        this.productos = res?.items ?? (Array.isArray(res) ? res : []);
        this.total = res?.total ?? this.productos.length;
        this.pagina = res?.pagina ?? this.pagina;
        this.tamanoPagina = res?.tamanoPagina ?? this.tamanoPagina;
        this.loading = false;
      })
    );

    this.sub.add(this.search$.pipe(
      switchMap(term => timer(250).pipe(takeUntil(this.cancelDraft$), map(() => term))),
    ).subscribe(term => {
      this.filters.buscar = term.trim();
      this.pagina = 1;
      this.syncUrl();
    }));

    this.sub.add(this.price$.pipe(
      switchMap(() => timer(300).pipe(takeUntil(this.cancelDraft$))),
    ).subscribe(() => {
      this.pagina = 1;
      this.syncUrl();
    }));

    this.sub.add(this.route.queryParamMap.subscribe((q) => {
      this.cancelDraft$.next();
      this.filters.buscar = q.get('buscar') || '';
      this.searchDraft = this.filters.buscar;
      this.filters.soloOfertas = q.get('soloOfertas') === 'true';
      this.filters.categoriaId = q.get('categoriaId') || null;
      const orden = q.get('orden'); this.filters.orden = orden || 'relevancia';
      const pmin = q.get('precioMin'); this.filters.precioMin = pmin != null && pmin !== '' ? +pmin : null;
      const pmax = q.get('precioMax'); this.filters.precioMax = pmax != null && pmax !== '' ? +pmax : null;
      this.pagina = +(q.get('pagina') || 1);
      this.emitLoad();

    }));
  }

  ngOnDestroy() { this.sub.unsubscribe(); }

  categoryLabel() { return this.categorias.find(c => c.id === this.filters.categoriaId)?.nombre || 'Categoría'; }

  breadcrumbLabel() {
    if (this.filters.buscar) return `Resultados para "${this.filters.buscar}"`;
    const c = this.categorias.find(x => x.id === this.filters.categoriaId);
    return c?.nombre || 'Catálogo';
  }
  pageTitle() {
    if (this.filters.buscar) return 'Resultados de búsqueda';
    const c = this.categorias.find(x => x.id === this.filters.categoriaId);
    return c?.nombre || 'Todos los productos';
  }
  get totalPaginas() { return Math.max(1, Math.ceil(this.total / this.tamanoPagina)); }
  precioActual(p: Producto) { return p.precioOferta ?? p.precioBase; }

  private buildParams() {
    const params: any = { ...this.filters, pagina: this.pagina, tamanoPagina: this.tamanoPagina };
    if (params.buscar === '') params.buscar = null;
    if (params.precioMin === '' || params.precioMin == null || Number.isNaN(params.precioMin)) params.precioMin = null;
    if (params.precioMax === '' || params.precioMax == null || Number.isNaN(params.precioMax)) params.precioMax = null;
    return params;
  }
  private emitLoad() {
    const params = this.buildParams();
    const key = JSON.stringify(params);
    if (key === this.lastQueryKey) return;
    this.lastQueryKey = key;
    this.query$.next(params);
  }

  submitSearch() { this.filters.buscar = (this.searchDraft || '').trim(); this.pagina = 1; this.syncUrl(); }
  onSearchInput(v: string) { this.searchDraft = v; this.search$.next(v); }
  setPrecioMin(v: any) { this.filters.precioMin = v === '' ? null : v; this.price$.next(); }
  setPrecioMax(v: any) { this.filters.precioMax = v === '' ? null : v; this.price$.next(); }
  applyFilters() { this.pagina = 1; this.syncUrl(); }
  setOrden(o: string) { this.filters.orden = o; this.pagina = 1; this.syncUrl(); }
  setCategoria(id: string | null) { this.filters.categoriaId = id; this.pagina = 1; this.syncUrl(); }
  toggleOfertas(force?: boolean) { this.filters.soloOfertas = typeof force === 'boolean' ? force : !this.filters.soloOfertas; this.pagina = 1; this.syncUrl(); }
  clearSearch() { this.searchDraft = ''; this.filters.buscar = ''; this.pagina = 1; this.syncUrl(); }
  resetFilters() { this.filters = { categoriaId: null, buscar: '', soloOfertas: false, precioMin: null, precioMax: null, orden: 'relevancia' }; this.searchDraft = ''; this.pagina = 1; this.syncUrl(); }
  retry() { if (this.lastParams) { this.loading = true; this.error=''; this.query$.next(this.lastParams); } else this.emitLoad(); }

  changePage(p: number) { this.pagina = p; this.syncUrl(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  syncUrl() {
    // Start the request immediately; URL synchronization must not duplicate it.
    this.cancelDraft$.next();
    this.filters.buscar = this.searchDraft.trim();
    this.emitLoad();
    const qp: any = {};
    if (this.filters.buscar) qp.buscar = this.filters.buscar;
    if (this.filters.categoriaId != null) qp.categoriaId = this.filters.categoriaId;
    if (this.filters.soloOfertas) qp.soloOfertas = 'true';
    if (this.filters.orden && this.filters.orden !== 'relevancia') qp.orden = this.filters.orden;
    if (this.filters.precioMin != null && this.filters.precioMin !== '') qp.precioMin = this.filters.precioMin;
    if (this.filters.precioMax != null && this.filters.precioMax !== '') qp.precioMax = this.filters.precioMax;
    if (this.pagina > 1) qp.pagina = this.pagina;
    this.router.navigate([], { relativeTo: this.route, queryParams: qp });
  }

  add(p: Producto) { this.cart.addItem(p.id, 1).subscribe({ next: () => {}, error: (e) => this.error = e?.userMessage || 'No se pudo agregar al carrito' }); }
}
