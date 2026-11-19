import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, catchError, map, of, switchMap, takeUntil, timer } from 'rxjs';
import { CatalogService } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { Categoria, Producto } from '../../core/models/api.models';
import { FieldErrorComponent } from '../../core/validation/form-rules';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FieldErrorComponent],
  template: `
  <section>
    <nav class="mb-2 flex items-center gap-1.5 text-xs font-medium text-on-surface-variant" aria-label="Ruta de navegación">
      <a routerLink="/" class="hover:text-primary">Inicio</a>
      <span class="material-symbols-outlined text-[16px]">chevron_right</span>
      <a routerLink="/productos" class="hover:text-primary">Tienda</a>
      <span class="material-symbols-outlined text-[16px]">chevron_right</span>
      <span class="font-semibold text-on-surface">{{ pageTitle() }}</span>
    </nav>

    <header class="flex flex-col justify-between gap-4 border-b border-separator-hairline-light pb-6 sm:flex-row sm:items-end">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-deep md:text-[32px]">{{ pageTitle() }}</h1>
        <p class="mt-1 text-sm font-medium text-on-surface-variant" role="status" aria-live="polite">
          {{ loading ? 'Buscando productos…' : error ? 'No se pudieron cargar los resultados.' : 'Mostrando ' + total + (total === 1 ? ' producto disponible' : ' productos disponibles') }}
        </p>
      </div>
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <label for="orden" class="whitespace-nowrap text-xs font-semibold text-on-surface-variant">Ordenar por:</label>
        <select id="orden" class="rounded-xl border border-separator-hairline-light bg-white py-2 pl-3 pr-8 text-xs font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30" [ngModel]="filters.orden" (ngModelChange)="setOrden($event)" name="orden">
          <option value="relevancia">Más relevantes</option>
          <option value="precio_asc">Menor precio</option>
          <option value="precio_desc">Mayor precio</option>
          <option value="calificacion">Mejor calificados</option>
        </select>
      </div>
    </header>

    <div class="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-4 xl:grid-cols-5">
      <aside class="space-y-6 rounded-2xl border border-separator-hairline-light bg-white p-5 shadow-sm lg:sticky lg:top-24" aria-label="Filtros">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div class="flex items-center gap-2 font-bold text-deep">
            <span class="material-symbols-outlined text-[20px] text-primary">tune</span>Filtros
          </div>
          <button type="button" class="text-xs font-semibold text-primary hover:underline" (click)="resetFilters()">Limpiar</button>
        </div>

        <div class="space-y-2.5">
          <label class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant" for="f-cat">Categoría</label>
          <select id="f-cat" class="w-full rounded-xl border border-separator-hairline-light bg-system-background px-3 py-2 text-xs font-medium focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" [ngModel]="filters.categoriaId" (ngModelChange)="setCategoria($event)" name="categoria">
            <option [ngValue]="null">Todas las categorías</option>
            @for (c of categorias; track c.id) { <option [ngValue]="c.id">{{c.nombre}}</option> }
          </select>
        </div>

        <div class="space-y-3">
          <span class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">Rango de precio</span>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label for="pmin" class="text-[11px] font-semibold text-on-surface-variant">Mín</label>
              <div class="relative mt-1">
                <span class="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs font-semibold text-on-surface-variant">$</span>
                <input id="pmin" type="number" min="0" class="w-full rounded-lg border border-separator-hairline-light bg-system-background py-2 pl-6 pr-2 text-xs font-medium focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="0" [ngModel]="filters.precioMin" (ngModelChange)="setPrecioMin($event)" name="pmin" />
              </div>
            </div>
            <div>
              <label for="pmax" class="text-[11px] font-semibold text-on-surface-variant">Máx</label>
              <div class="relative mt-1">
                <span class="absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs font-semibold text-on-surface-variant">$</span>
                <input id="pmax" type="number" min="0" class="w-full rounded-lg border border-separator-hairline-light bg-system-background py-2 pl-6 pr-2 text-xs font-medium focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="500" [ngModel]="filters.precioMax" (ngModelChange)="setPrecioMax($event)" name="pmax" />
              </div>
            </div>
          </div>
          <app-field-error [message]="precioError()" />
        </div>

        <div class="border-t border-slate-100 pt-4">
          <label class="group flex cursor-pointer items-center gap-3">
            <input type="checkbox" class="h-4 w-4 rounded border-slate-300 accent-primary" [ngModel]="filters.soloOfertas" (ngModelChange)="toggleOfertas($event)" name="ofertas" />
            <span class="text-xs font-semibold group-hover:text-primary">Solo productos en oferta</span>
          </label>
        </div>
      </aside>

      <div class="min-w-0 space-y-6 lg:col-span-3 xl:col-span-4">
        <div *ngIf="filters.buscar || filters.categoriaId || filters.soloOfertas" class="flex flex-wrap items-center gap-2">
          <button *ngIf="filters.buscar" class="chip badge-soft-blue" (click)="clearSearch()">Búsqueda: {{filters.buscar}} <span class="material-symbols-outlined text-[16px]">close</span></button>
          <button *ngIf="filters.categoriaId" class="chip badge-soft-blue" (click)="setCategoria(null)">{{ categoryLabel() }} <span class="material-symbols-outlined text-[16px]">close</span></button>
          <button *ngIf="filters.soloOfertas" class="chip badge-soft-blue" (click)="toggleOfertas(false)">Ofertas <span class="material-symbols-outlined text-[16px]">close</span></button>
        </div>

        <div *ngIf="error" class="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 font-body-sm text-red-700" role="alert">
          <span>{{error}}</span>
          <button class="font-label-md underline" (click)="retry()">Reintentar</button>
        </div>

        <div *ngIf="loading && productos.length === 0" class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          @for (s of skeletons; track s) {
            <div class="animate-pulse overflow-hidden rounded-2xl border border-separator-hairline-light bg-white p-4">
              <div class="mb-4 aspect-[4/3] rounded-xl bg-surface-container-low"></div>
              <div class="mb-2 h-4 w-3/4 rounded bg-surface-container-low"></div>
              <div class="mb-4 h-3 w-1/2 rounded bg-surface-container-low"></div>
              <div class="h-7 w-1/3 rounded bg-surface-container-low"></div>
            </div>
          }
        </div>

        <div class="grid grid-cols-1 gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3" [class.opacity-50]="loading" [attr.aria-busy]="loading" [attr.inert]="loading ? '' : null">
          @for (p of productos; track p.id) {
            <article class="group flex flex-col justify-between overflow-hidden rounded-2xl border border-separator-hairline-light bg-white shadow-sm transition-all duration-300 hover:border-[#C9A0F0] hover:shadow-xl hover:shadow-primary/10">
              <div class="relative p-4">
                <div class="absolute left-6 top-6 z-10 flex items-center gap-1.5">
                  <span *ngIf="p.precioOferta != null" class="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">Oferta</span>
                  <span *ngIf="descuento(p) as d" class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">-{{d}}%</span>
                  <span *ngIf="p.stock>0 && p.stock<=5" class="chip badge-orange">Últimas {{p.stock}}</span>
                  <span *ngIf="p.stock<=0" class="chip badge-red">Agotado</span>
                </div>
                <a [routerLink]="['/producto', p.id]" class="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-system-background" [attr.aria-label]="'Ver ' + p.nombre">
                  <img *ngIf="p.imagenPrincipalUrl" [src]="p.imagenPrincipalUrl" [alt]="p.nombre" loading="lazy" decoding="async" class="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105" />
                  <span *ngIf="!p.imagenPrincipalUrl" class="material-symbols-outlined text-[40px] text-on-surface-variant/40">image</span>
                </a>
                <div class="mt-4">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-primary">{{p.marca || p.categoriaNombre || 'Producto'}}</span>
                  <a [routerLink]="['/producto', p.id]" class="mt-0.5 block text-sm font-bold leading-snug text-on-surface line-clamp-2 min-h-[2.6em] transition-colors hover:text-primary">{{p.nombre}}</a>
                  <div class="mt-2 flex items-center gap-1.5">
                    <span class="text-xs text-amber-400" aria-hidden="true">{{ estrellas(p) }}</span>
                    <span class="text-xs font-medium text-on-surface-variant">{{ p.totalResenas ? (p.calificacionPromedio | number:'1.1-1') + ' (' + p.totalResenas + ')' : 'Sin reseñas' }}</span>
                  </div>
                  <div class="mt-3 flex items-baseline gap-2">
                    <span class="text-2xl font-extrabold tracking-tight text-on-surface">\${{precioActual(p) | number:'1.2-2'}}</span>
                    <span *ngIf="p.precioOferta != null" class="text-xs font-semibold text-on-surface-variant line-through">\${{p.precioBase | number:'1.2-2'}}</span>
                  </div>
                </div>
              </div>
              <div class="p-4 pt-0">
                <button class="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-primary/20 transition-all hover:bg-deep disabled:cursor-not-allowed disabled:opacity-45" [disabled]="p.stock<=0" (click)="add(p)">
                  <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                  <span>{{ p.stock>0 ? 'Agregar al carrito' : 'Sin stock' }}</span>
                </button>
              </div>
            </article>
          }
        </div>

        <div *ngIf="!loading && productos.length===0 && !error" class="rounded-2xl border border-separator-hairline-light bg-white p-12 text-center">
          <span class="material-symbols-outlined text-[40px] text-on-surface-variant/40">search_off</span>
          <p class="font-title-md mt-3">No encontramos productos</p>
          <p class="font-body-sm mt-1 text-on-surface-variant">Prueba con otros términos o quita algún filtro.</p>
          <button class="btn-ghost mt-5" (click)="resetFilters()">Limpiar filtros</button>
        </div>

        <nav *ngIf="!loading && total>tamanoPagina" class="mt-8 flex flex-col items-center justify-between gap-4 border-t border-separator-hairline-light pt-6 sm:flex-row" aria-label="Paginación">
          <span class="text-xs font-medium text-on-surface-variant">Página <strong class="text-on-surface">{{pagina}}</strong> de <strong class="text-on-surface">{{totalPaginas}}</strong></span>
          <div class="flex items-center gap-1.5">
            <button class="rounded-lg border border-separator-hairline-light p-2 text-on-surface hover:bg-surface-container-low disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent" [disabled]="pagina<=1" (click)="changePage(pagina-1)" aria-label="Página anterior"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
            @for (n of paginas(); track n) {
              <button class="h-9 w-9 rounded-lg text-xs" [ngClass]="n===pagina ? 'bg-primary font-bold text-white shadow-sm shadow-primary/30' : 'font-semibold text-on-surface hover:bg-surface-container-low'" (click)="changePage(n)" [attr.aria-current]="n===pagina ? 'page' : null">{{n}}</button>
            }
            <button class="rounded-lg border border-separator-hairline-light p-2 text-on-surface hover:bg-surface-container-low disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent" [disabled]="pagina>=totalPaginas" (click)="changePage(pagina+1)" aria-label="Página siguiente"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
          </div>
        </nav>
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

  private readonly toast = inject(ToastService);
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
  /** Porcentaje de descuento de una oferta (0 si no hay). */
  descuento(p: Producto): number {
    return p.precioOferta != null && p.precioBase > 0 ? Math.round((1 - p.precioOferta / p.precioBase) * 100) : 0;
  }
  estrellas(p: Producto): string {
    const n = Math.round(p.calificacionPromedio || 0);
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }
  /** Números de página a mostrar (ventana de 5 alrededor de la actual). */
  paginas(): number[] {
    const total = this.totalPaginas, ini = Math.max(1, Math.min(this.pagina - 2, total - 4)), fin = Math.min(total, ini + 4);
    return Array.from({ length: fin - ini + 1 }, (_, i) => ini + i);
  }

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
  precioError(): string {
    const { precioMin: a, precioMax: b } = this.filters as any;
    if (a != null && +a < 0) return 'El precio mínimo no puede ser negativo.';
    if (b != null && +b < 0) return 'El precio máximo no puede ser negativo.';
    if (a != null && b != null && +a > +b) return 'El precio mínimo no puede ser mayor que el máximo.';
    return '';
  }
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

  add(p: Producto) { this.cart.addItem(p.id, 1, { nombre: p.nombre, marca: p.marca || p.categoriaNombre, imagenUrl: p.imagenPrincipalUrl, precio: this.precioActual(p), precioBase: p.precioOferta != null ? p.precioBase : null }).subscribe({ next: () => {}, error: (e) => { this.error = e?.userMessage || 'No se pudo agregar al carrito'; this.toast.error(this.error); } }); }
}
