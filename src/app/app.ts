import { Component, OnDestroy, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { CatalogService } from './core/services/catalog.service';
import { Categoria } from './core/models/api.models';
import { ToastContainerComponent } from './core/ui/toast-container.component';
import { CoveragePickerComponent } from './core/ui/coverage-picker.component';
import { CoverageService } from './core/services/coverage.service';
import { NavTracker } from './core/ui/back-link.component';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, NgIf, ToastContainerComponent, CoveragePickerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  searchText = '';
  searchDept: string | null = null;
  showMenu = false;
  readonly departments = signal<Categoria[]>([]);
  private readonly subscriptions = new Subscription();

  constructor(public auth: AuthService, public cart: CartService, public coverage: CoverageService, private router: Router, catalog: CatalogService) {
    inject(NavTracker);
    this.coverage.cargar();
    this.subscriptions.add(catalog.getCategorias().subscribe({
      next: categories => this.departments.set(categories),
      error: () => {},
    }));
    this.subscriptions.add(this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.searchText = this.router.parseUrl(this.router.url).queryParams['buscar'] ?? '';
    }));
    // Carga diferida para no bloquear la primera pintura; errores se manejan en silencio.
    setTimeout(() => this.cart.load().subscribe({ error: () => {} }), 0);
    if (this.auth.token()) setTimeout(() => this.auth.me().subscribe({ error: () => {} }), 0);
  }

  ngOnDestroy() { this.subscriptions.unsubscribe(); }

  toggleMenu() { this.showMenu = !this.showMenu; }
  onSearch() {
    const query: any = {};
    if (this.searchText?.trim()) query.buscar = this.searchText.trim();
    this.showMenu = false;
    this.router.navigate(['/productos'], { queryParams: query });
  }

  currentUrl() { return this.router.url; }
  isCatalogPage() {
    const path = this.router.url.split('?')[0];
    return path === '/' || path === '/productos';
  }
  isOffersPage() {
    return this.router.parseUrl(this.router.url).queryParams['soloOfertas'] === 'true';
  }
  pageLabel() {
    const path = this.router.url.split('?')[0];
    if (path === '/' || path === '/productos') return 'Catálogo';
    if (path.startsWith('/producto/')) return 'Detalle del producto';
    if (path === '/carrito') return 'Mi carrito';
    if (path === '/checkout') return 'Finalizar compra';
    if (path === '/mis-pedidos') return 'Mis pedidos';
    if (path === '/registro') return 'Crear cuenta';
    if (path === '/login') return 'Iniciar sesión';
    return 'Tienda';
  }
  logout() { this.auth.logout(false); this.cart.load().subscribe({ error: () => {} }); this.router.navigateByUrl('/'); }
}
