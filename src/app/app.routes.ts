import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/catalog/catalog.page').then((m) => m.CatalogPage) },
  { path: 'productos', loadComponent: () => import('./features/catalog/catalog.page').then((m) => m.CatalogPage) },
  { path: 'producto/:id', loadComponent: () => import('./features/product/product-detail.page').then((m) => m.ProductDetailPage) },
  { path: 'carrito', loadComponent: () => import('./features/cart/cart.page').then((m) => m.CartPage) },
  { path: 'checkout', canActivate: [authGuard], loadComponent: () => import('./features/checkout/checkout.page').then((m) => m.CheckoutPage) },
  { path: 'pago/paypal/retorno', canActivate: [authGuard], loadComponent: () => import('./features/checkout/paypal-return.page').then((m) => m.PayPalReturnPage) },
  { path: 'pago/paypal/cancelado', loadComponent: () => import('./features/checkout/paypal-cancel.page').then((m) => m.PayPalCancelPage) },
  { path: 'mis-pedidos', canActivate: [authGuard], loadComponent: () => import('./features/orders/orders.page').then((m) => m.OrdersPage) },
  { path: 'mi-cuenta', canActivate: [authGuard], loadComponent: () => import('./features/account/account.page').then((m) => m.AccountPage) },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage) },
  { path: 'registro', loadComponent: () => import('./features/auth/registro/registro.page').then((m) => m.RegistroPage) },
  { path: '**', redirectTo: '' },
];
