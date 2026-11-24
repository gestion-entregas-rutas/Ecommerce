import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { IntervalosDisponibles } from '../models/api.models';

/** Oferta de intervalos de entrega a domicilio. Consultar no reserva capacidad. */
@Injectable({ providedIn: 'root' })
export class DeliverySlotsService {
  constructor(private http: HttpClient) {}

  intervalos(fecha: string, latitud: number, longitud: number) {
    const params = new HttpParams().set('fecha', fecha).set('latitud', latitud).set('longitud', longitud);
    return this.http.get<IntervalosDisponibles>(`${environment.apiBaseUrl}/entregas/intervalos`, { params });
  }
}
