import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { MENSAJE_GENERICO } from './error-messages';

/**
 * Errores inesperados de la aplicación: se registran en consola para el equipo
 * y la persona recibe un aviso claro en español en lugar de que la pantalla falle en silencio.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);
  private ultimo = 0;

  handleError(error: unknown) {
    console.error(error);
    const ahora = Date.now();
    if (ahora - this.ultimo < 3000) return; // evita avisos en cascada
    this.ultimo = ahora;
    this.toast.error(MENSAJE_GENERICO);
  }
}
