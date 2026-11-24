import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface ToastProducto { nombre: string; marca?: string | null; imagenUrl?: string | null; cantidad: number; precio: number; precioBase?: number | null; }
export interface Toast { id: number; type: ToastType; message: string; ms: number; producto?: ToastProducto; carrito?: number; }

// Avisos breves: lo justo para leerlos. Los errores duran un poco más porque explican qué hacer.
const DURACION: Record<ToastType, number> = { success: 2500, info: 2500, warning: 3500, error: 4500 };

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
    this.show('success', '¡Agregado al carrito con éxito!', 3500, { producto, carrito });
  }

  success(message: string, ms?: number) { this.show('success', message, ms); }
  error(message: string, ms?: number) { this.show('error', message, ms); }
  info(message: string, ms?: number) { this.show('info', message, ms); }
  warning(message: string, ms?: number) { this.show('warning', message, ms); }

  dismiss(id: number) { this.lista.update((l) => l.filter((t) => t.id !== id)); }
}
