import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, shareReplay, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Categoria, PaginaDto, Producto, ProductoListParams, ResenaProducto, Subcategoria } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private categorias$?: Observable<Categoria[]>;

  constructor(private http: HttpClient) {}

  getCategorias(): Observable<Categoria[]> {
    if (!this.categorias$) {
      this.categorias$ = this.http.get<Categoria[] | { items: Categoria[] }>(`${environment.apiBaseUrl}/categorias`).pipe(
        timeout(12000),
        map((res: any) => (Array.isArray(res) ? res : (res?.items ?? [])) as Categoria[]),
        // The virtual "all departments" entry is represented by no filter.
        map(categories => categories.filter(category => category.numero !== 0)),
        shareReplay(1),
      );
    }
    return this.categorias$;
  }

  getSubcategorias(categoriaId?: string) {
    if (categoriaId != null) {
      return this.http.get<Subcategoria[] | { items: Subcategoria[] }>(`${environment.apiBaseUrl}/categorias/${categoriaId}/subcategorias`).pipe(
        map((res: any) => Array.isArray(res) ? res : (res?.items ?? [])),
      );
    }
    return this.http.get<Subcategoria[] | { items: Subcategoria[] }>(`${environment.apiBaseUrl}/subcategorias`).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.items ?? [])),
    );
  }

  getProductos(params: ProductoListParams) {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<PaginaDto<Producto>>(`${environment.apiBaseUrl}/productos`, { params: httpParams }).pipe(timeout(15000));
  }

  getProducto(id: string) {
    return this.http.get<Producto>(`${environment.apiBaseUrl}/productos/${id}`).pipe(timeout(12000));
  }

  crearResena(productoId: string, payload: { calificacion: number; comentario?: string }) {
    return this.http.post<ResenaProducto>(`${environment.apiBaseUrl}/productos/${productoId}/resenas`, payload);
  }

  getZonas() {
    return this.http.get<any[] | { items: any[] }>(`${environment.apiBaseUrl}/zonas`).pipe(
      map((res: any) => Array.isArray(res) ? res : (res?.items ?? [])),
    );
  }
}
