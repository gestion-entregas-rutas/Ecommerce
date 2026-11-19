import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface ToastProducto { nombre: string; marca?: string | null; imagenUrl?: string | null; cantidad: number; precio: number; precioBase?: number | null; }
export interface Toast { id: number; type: ToastType; message: string; ms: number; producto?: ToastProducto; carrito?: number; }

const DURACION: Record<ToastType, number> = { success: 4500, info: 5000, warning: 6000, error: 7000 };

/** Avisos breves (toasts) para informar al cliente de lo que acaba de pasar. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 0;
  private readonly lista = signal<Toast[]>([]);
  readonly toasts = this.lista.asReadonly();

  show(type: ToastType, message: string, ms?: number, extra?: { producto?: ToastProducto; carrito?: number }) {
    if (!message) return;
    // Evita apilar el mismo aviso repetido (por ejemplo, varios clics seguidos).
    if (this.lista().some((t) => t.type === type && t.message === message)) return;
    const id = ++this.seq;
    const dur = ms ?? DURACION[type];
    this.lista.update((l) => [...l.slice(-2), { id, type, message, ms: dur, ...extra }]);
    setTimeout(() => this.dismiss(id), dur);
  }

  /** Aviso de "agregado al carrito" con el producto y acceso directo al carrito. */
  cartAdded(producto: ToastProducto, carrito: number) {
    this.show('success', '¡Agregado al carrito con éxito!', 6000, { producto, carrito });
  }

  success(message: string, ms?: number) { this.show('success', message, ms); }
  error(message: string, ms?: number) { this.show('error', message, ms); }
  info(message: string, ms?: number) { this.show('info', message, ms); }
  warning(message: string, ms?: number) { this.show('warning', message, ms); }

  dismiss(id: number) { this.lista.update((l) => l.filter((t) => t.id !== id)); }
}
