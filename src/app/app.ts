import { Component, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';
import { CatalogService } from './core/services/catalog.service';
import { Categoria } from './core/models/api.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, FormsModule, NgIf],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  searchText = '';
  searchDept: string | null = null;
  showMenu = false;
  readonly departments = signal<Categoria[]>([]);
  private readonly subscriptions = new Subscription();

  constructor(public auth: AuthService, public cart: CartService, private router: Router, catalog: CatalogService) {
    this.subscriptions.add(catalog.getCategorias().subscribe({
      next: categories => this.departments.set(categories),
      error: () => {},
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
  logout() { this.auth.logout(false); this.cart.load().subscribe({ error: () => {} }); this.router.navigateByUrl('/'); }
}
