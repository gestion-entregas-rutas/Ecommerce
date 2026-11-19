import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import { CartService } from '../../core/services/cart.service';
import { CatalogService } from '../../core/services/catalog.service';
import { OrderService } from '../../core/services/order.service';
import { BackLinkComponent } from '../../core/ui/back-link.component';
import { ToastService } from '../../core/services/toast.service';
import { guardarPayPalPendiente, borrarPayPalPendiente } from '../../core/utils/paypal-pendiente';
import { configurarIconosLeaflet, iconoCasa } from '../../core/utils/leaflet-icons';
import { AuthService } from '../../core/services/auth.service';
import { CoverageService, puntoEnPoligono } from '../../core/services/coverage.service';
import { FieldErrorComponent, FormValidator, cedula, compose, cvv, fechaNoPasada, horaEntrega, maxLen, minLen, nombrePersona, numeroTarjeta, required, telefono, vencimientoTarjeta } from '../../core/validation/form-rules';
import { CheckoutResponse } from '../../core/models/api.models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, FieldErrorComponent, BackLinkComponent],
  template: `
  <section class="space-y-7 pb-4">
    <!-- Cabecera -->
    <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div>
        <app-back-link fallback="/carrito" label="Volver al carrito" />
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="text-2xl font-extrabold tracking-tight text-deep md:text-[32px]">Finalizar compra</h1>
          <span class="flex items-center gap-1 rounded-full border border-[#D9BDF2] bg-primary-fixed px-2.5 py-0.5 text-xs font-bold text-deep">
            <span class="h-1.5 w-1.5 rounded-full bg-primary"></span>Paso final
          </span>
        </div>
        <p class="mt-0.5 text-sm text-on-surface-variant">Cuéntanos cómo recibes tu pedido y cómo pagas. Reservamos tu stock mientras terminas.</p>
      </div>
    </div>

    <!-- Pasos -->
    <ol class="relative flex flex-col items-stretch gap-4 overflow-hidden rounded-2xl border border-separator-hairline-light bg-white p-4 shadow-sm md:flex-row md:items-center md:p-5" aria-label="Pasos de la compra">
      <li class="flex flex-1 items-center gap-4 rounded-xl border p-3 md:p-3.5" [ngClass]="pasoEntregaOk() ? 'border-green-200 bg-green-50/60' : 'border-[#D9BDF2] bg-gradient-to-r from-primary-fixed/70 to-white shadow-sm'">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-base font-bold text-white shadow-md" [ngClass]="pasoEntregaOk() ? 'bg-status-delivered' : 'bg-gradient-to-br from-primary to-deep shadow-primary/30'">
          @if (pasoEntregaOk()) { <span class="material-symbols-outlined text-[24px]">check</span> } @else { 1 }
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-sm font-bold">Dirección y entrega</h2>
            <span class="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white" [ngClass]="pasoEntregaOk() ? 'bg-status-delivered' : 'bg-primary'">{{ pasoEntregaOk() ? 'Listo' : 'En curso' }}</span>
          </div>
          <p class="mt-0.5 truncate text-xs font-medium text-on-surface-variant">{{ resumenEntrega() }}</p>
        </div>
        <span class="material-symbols-outlined hidden text-[26px] text-primary sm:block">{{ tipoEntrega==='Domicilio' ? 'local_shipping' : 'storefront' }}</span>
      </li>
      <li class="hidden items-center justify-center px-1 md:flex" aria-hidden="true"><span class="h-1 w-12 rounded-full bg-gradient-to-r from-primary to-slate-200"></span></li>
      <li class="flex flex-1 items-center gap-4 rounded-xl border border-separator-hairline-light bg-system-background p-3 md:p-3.5">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-separator-hairline-light bg-white text-base font-bold text-on-surface-variant">2</span>
        <div class="min-w-0 flex-1">
          <h2 class="text-sm font-semibold">Método de pago</h2>
          <p class="mt-0.5 truncate text-xs text-on-surface-variant">{{ pago.tipo }}</p>
        </div>
        <span class="material-symbols-outlined hidden text-[26px] text-on-surface-variant sm:block">credit_card</span>
      </li>
    </ol>

    <div class="grid grid-cols-1 items-start gap-7 lg:grid-cols-12">
      <div class="space-y-6 lg:col-span-8">

        <!-- Tipo de entrega -->
        <section class="space-y-5 rounded-2xl border border-separator-hairline-light bg-white p-6 shadow-sm" aria-labelledby="paso-entrega">
          <div class="flex items-center gap-3">
            <span class="grid h-9 w-9 place-items-center rounded-xl bg-primary-fixed text-deep"><span class="material-symbols-outlined text-[22px]">local_shipping</span></span>
            <div>
              <h2 id="paso-entrega" class="text-lg font-bold leading-tight">Tipo de entrega</h2>
              <p class="text-xs text-on-surface-variant">Elige cómo quieres recibir tu pedido</p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2" role="radiogroup" aria-label="Tipo de entrega">
            <button type="button" role="radio" [attr.aria-checked]="tipoEntrega==='Domicilio'" (click)="setTipo('Domicilio')"
                    class="flex flex-col rounded-xl p-4 text-left transition-all"
                    [ngClass]="tipoEntrega==='Domicilio' ? 'border-2 border-primary bg-gradient-to-br from-primary-fixed/60 via-white to-white shadow-md shadow-primary/10' : 'border border-separator-hairline-light bg-white hover:border-[#C9A0F0]'">
              <span class="flex items-start justify-between">
                <span class="flex items-center gap-3">
                  <span class="grid h-10 w-10 place-items-center rounded-full" [ngClass]="tipoEntrega==='Domicilio' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-100 text-on-surface-variant'"><span class="material-symbols-outlined text-[22px]">two_wheeler</span></span>
                  <span><span class="block text-sm font-bold">Envío a domicilio</span><span class="mt-0.5 block text-xs text-on-surface-variant">Llega a tu puerta</span></span>
                </span>
                <span class="grid h-5 w-5 place-items-center rounded-full" [ngClass]="tipoEntrega==='Domicilio' ? 'bg-primary text-white' : 'border-2 border-slate-300'">
                  @if (tipoEntrega==='Domicilio') { <span class="material-symbols-outlined text-[14px]">check</span> }
                </span>
              </span>
              <span class="mt-4 flex items-center justify-between border-t pt-3 text-xs" [ngClass]="tipoEntrega==='Domicilio' ? 'border-primary/15' : 'border-slate-100'">
                <span class="flex items-center gap-1.5 font-semibold" [ngClass]="coberturaOk ? 'text-status-delivered' : 'text-primary'"><span class="material-symbols-outlined text-[16px]">{{ coberturaOk ? 'check_circle' : 'pin_drop' }}</span>{{ coberturaOk ? 'Con cobertura' : 'Se valida con tu ubicación' }}</span>
                <span class="font-semibold text-on-surface-variant">Costo al pagar</span>
              </span>
            </button>

            <button type="button" role="radio" [attr.aria-checked]="tipoEntrega==='RetiroTienda'" (click)="setTipo('RetiroTienda')"
                    class="flex flex-col rounded-xl p-4 text-left transition-all"
                    [ngClass]="tipoEntrega==='RetiroTienda' ? 'border-2 border-primary bg-gradient-to-br from-primary-fixed/60 via-white to-white shadow-md shadow-primary/10' : 'border border-separator-hairline-light bg-white hover:border-[#C9A0F0]'">
              <span class="flex items-start justify-between">
                <span class="flex items-center gap-3">
                  <span class="grid h-10 w-10 place-items-center rounded-full" [ngClass]="tipoEntrega==='RetiroTienda' ? 'bg-primary text-white shadow-md shadow-primary/30' : 'bg-slate-100 text-on-surface-variant'"><span class="material-symbols-outlined text-[22px]">storefront</span></span>
                  <span><span class="block text-sm font-bold">Retiro en tienda</span><span class="mt-0.5 block text-xs text-on-surface-variant">Universidad Técnica de Ambato / Hub Metropolitano</span></span>
                </span>
                <span class="grid h-5 w-5 place-items-center rounded-full" [ngClass]="tipoEntrega==='RetiroTienda' ? 'bg-primary text-white' : 'border-2 border-slate-300'">
                  @if (tipoEntrega==='RetiroTienda') { <span class="material-symbols-outlined text-[14px]">check</span> }
                </span>
              </span>
              <span class="mt-4 flex items-center justify-between border-t pt-3 text-xs" [ngClass]="tipoEntrega==='RetiroTienda' ? 'border-primary/15' : 'border-slate-100'">
                <span class="flex items-center gap-1.5 text-on-surface-variant"><span class="material-symbols-outlined text-[16px]">check_circle</span>Disponible hoy</span>
                <span class="font-bold text-status-delivered">Sin costo adicional</span>
              </span>
            </button>
          </div>
        </section>

        <!-- Datos de entrega -->
        <section class="space-y-6 rounded-2xl border border-separator-hairline-light bg-white p-6 shadow-sm md:p-7" aria-labelledby="datos-entrega">
          <div class="border-b border-slate-100 pb-3">
            <h2 id="datos-entrega" class="text-lg font-bold leading-tight">{{ tipoEntrega==='Domicilio' ? 'Datos del destinatario y entrega' : 'Datos de quien retira' }}</h2>
            <p class="text-xs text-on-surface-variant">{{ tipoEntrega==='Domicilio' ? 'Con estos datos el repartidor llega a tu puerta.' : 'Presenta tu cédula al retirar.' }}</p>
          </div>

          <form *ngIf="tipoEntrega==='RetiroTienda'" class="grid gap-x-5 gap-y-5 sm:grid-cols-2" novalidate>
            <div class="sm:col-span-2"><label class="lbl" for="rnombre"><span class="material-symbols-outlined">person</span>Nombre de quien retira</label><input id="rnombre" [class.!border-red-500]="vRetiro.error(retiro,'nombreQuienRetira')" class="input-field" [(ngModel)]="retiro.nombreQuienRetira" (blur)="vRetiro.tocar('nombreQuienRetira')" name="rnombre" autocomplete="name" required>
              <app-field-error [message]="vRetiro.error(retiro,'nombreQuienRetira')" /></div>
            <div><label class="lbl" for="rcedula"><span class="material-symbols-outlined">badge</span>Cédula</label><input id="rcedula" [class.!border-red-500]="vRetiro.error(retiro,'cedulaQuienRetira')" class="input-field" [(ngModel)]="retiro.cedulaQuienRetira" (blur)="vRetiro.tocar('cedulaQuienRetira')" name="rcedula" inputmode="numeric" required>
              <app-field-error [message]="vRetiro.error(retiro,'cedulaQuienRetira')" /></div>
            <div><label class="lbl" for="rtel"><span class="material-symbols-outlined">call</span>Teléfono de contacto</label><input id="rtel" [class.!border-red-500]="vRetiro.error(retiro,'telefonoContacto')" class="input-field" [(ngModel)]="retiro.telefonoContacto" (blur)="vRetiro.tocar('telefonoContacto')" name="rtel" inputmode="tel" autocomplete="tel" required>
              <app-field-error [message]="vRetiro.error(retiro,'telefonoContacto')" /></div>
            <div><label class="lbl" for="rfecha"><span class="material-symbols-outlined">calendar_today</span>Fecha de retiro</label><input id="rfecha" [class.!border-red-500]="vRetiro.error(retiro,'fechaRetiro')" class="input-field" type="date" [(ngModel)]="retiro.fechaRetiro" (blur)="vRetiro.tocar('fechaRetiro')" name="rfecha" required>
              <app-field-error [message]="vRetiro.error(retiro,'fechaRetiro')" /></div>
            <div><label class="lbl" for="rfranja"><span class="material-symbols-outlined">schedule</span>Franja horaria</label><input id="rfranja" [class.!border-red-500]="vRetiro.error(retiro,'franjaHoraria')" class="input-field" [(ngModel)]="retiro.franjaHoraria" (blur)="vRetiro.tocar('franjaHoraria')" name="rfranja" placeholder="10:00 - 12:00" required>
              <app-field-error [message]="vRetiro.error(retiro,'franjaHoraria')" /></div>
          </form>

          <div *ngIf="tipoEntrega==='Domicilio'" class="space-y-6">
            <div class="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <div><label class="lbl" for="dnombre"><span class="material-symbols-outlined">person</span>Nombre del destinatario</label><input id="dnombre" [class.!border-red-500]="vDom.error(domicilio,'destinatarioNombre')" class="input-field" [(ngModel)]="domicilio.destinatarioNombre" (blur)="vDom.tocar('destinatarioNombre')" name="dnombre" autocomplete="name" required>
                <app-field-error [message]="vDom.error(domicilio,'destinatarioNombre')" /></div>
              <div><label class="lbl" for="dtel"><span class="material-symbols-outlined">call</span>Número de contacto</label><input id="dtel" [class.!border-red-500]="vDom.error(domicilio,'destinatarioTelefono')" class="input-field" [(ngModel)]="domicilio.destinatarioTelefono" (blur)="vDom.tocar('destinatarioTelefono')" name="dtel" inputmode="tel" autocomplete="tel" required>
                <app-field-error [message]="vDom.error(domicilio,'destinatarioTelefono')" /></div>
              <div class="sm:col-span-2"><label class="lbl" for="ddir"><span class="material-symbols-outlined">pin_drop</span>Dirección exacta o referencia</label><input id="ddir" [class.!border-red-500]="vDom.error(domicilio,'direccionTexto')" class="input-field" [(ngModel)]="domicilio.direccionTexto" (blur)="vDom.tocar('direccionTexto')" name="ddir" autocomplete="street-address" placeholder="Calle principal, intersección y referencia" required>
                <app-field-error [message]="vDom.error(domicilio,'direccionTexto')" /></div>
              <div><label class="lbl" for="dfecha"><span class="material-symbols-outlined">calendar_today</span>Fecha de entrega</label><input id="dfecha" [class.!border-red-500]="vDom.error(domicilio,'fechaEntrega')" class="input-field" type="date" [(ngModel)]="domicilio.fechaEntrega" (blur)="vDom.tocar('fechaEntrega')" name="dfecha" required>
                <app-field-error [message]="vDom.error(domicilio,'fechaEntrega')" /></div>
              <div><label class="lbl" for="dhora"><span class="material-symbols-outlined">schedule</span>Hora de entrega</label><input id="dhora" [class.!border-red-500]="vDom.error(domicilio,'horaEntrega')" class="input-field" type="time" [(ngModel)]="domicilio.horaEntrega" (blur)="vDom.tocar('horaEntrega')" name="dhora" required>
                <app-field-error [message]="vDom.error(domicilio,'horaEntrega')" /></div>
              <div class="sm:col-span-2"><label class="lbl" for="dobs"><span class="material-symbols-outlined">edit_note</span>Instrucciones para el conductor <span class="font-normal normal-case text-on-surface-variant">(opcional)</span></label><textarea id="dobs" [class.!border-red-500]="vDom.error(domicilio,'observaciones')" class="input-field" rows="2" [(ngModel)]="domicilio.observaciones" (blur)="vDom.tocar('observaciones')" name="dobs" placeholder="Ej. Dejar con el guardia si no respondo"></textarea>
                <app-field-error [message]="vDom.error(domicilio,'observaciones')" /></div>
            </div>

            <!-- Mapa y cobertura -->
            <div class="space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <span class="text-sm font-bold">Ubicación de entrega</span>
                <span *ngIf="domicilio.latitud != null && coberturaMsg" class="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold" [ngClass]="coberturaOk ? 'border-green-200 bg-green-50 text-status-delivered' : 'border-red-200 bg-red-50 text-status-urgent'">
                  <span class="material-symbols-outlined text-[16px]" style="font-variation-settings:'FILL' 1">{{ coberturaOk ? 'check_circle' : 'location_off' }}</span>{{ coberturaOk ? 'Con cobertura' : 'Sin cobertura' }}
                </span>
              </div>
              <p class="text-xs text-on-surface-variant">Toca el mapa para marcar dónde entregamos. Las zonas moradas tienen cobertura.</p>
              <div class="relative">
                <div #mapEl class="h-72 w-full overflow-hidden rounded-2xl border border-separator-hairline-light shadow-inner"></div>
                <button type="button" class="absolute bottom-3 right-3 z-[500] flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-deep shadow-md hover:bg-primary-fixed" (click)="usarGps()">
                  <span class="material-symbols-outlined text-[18px] text-primary">my_location</span>Usar mi ubicación
                </button>
              </div>
              <app-field-error [message]="domicilio.latitud == null && vDom.enviado ? 'Selecciona tu ubicación en el mapa.' : ''" />
              <div *ngIf="coberturaMsg" class="rounded-lg px-3 py-2 text-sm" [ngClass]="coberturaOk ? 'badge-green' : 'badge-red'" role="status">{{coberturaMsg}}</div>
            </div>
          </div>
        </section>

        <!-- Método de pago -->
        <section class="space-y-5 rounded-2xl border border-separator-hairline-light bg-white p-6 shadow-sm" aria-labelledby="paso-pago">
          <div class="flex items-center gap-3">
            <span class="grid h-9 w-9 place-items-center rounded-xl bg-primary-fixed text-deep"><span class="material-symbols-outlined text-[22px]">credit_card</span></span>
            <div>
              <h2 id="paso-pago" class="text-lg font-bold leading-tight">Método de pago</h2>
              <p class="text-xs text-on-surface-variant">Pago simulado para completar tu pedido</p>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Método de pago">
            <button *ngFor="let m of metodos" type="button" role="radio" [attr.aria-checked]="pago.tipo===m.id" (click)="pago.tipo=m.id"
                    class="flex items-center gap-3 rounded-xl p-3.5 text-left transition-all"
                    [ngClass]="pago.tipo===m.id ? 'border-2 border-primary bg-primary-fixed/50 shadow-sm' : 'border border-separator-hairline-light bg-white hover:border-[#C9A0F0]'">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full" [ngClass]="pago.tipo===m.id ? 'bg-primary text-white' : 'bg-slate-100 text-on-surface-variant'"><span class="material-symbols-outlined text-[20px]">{{m.icono}}</span></span>
              <span class="text-sm font-bold">{{m.id}}</span>
            </button>
          </div>

          <div *ngIf="pago.tipo==='PayPal'" class="surface-subtle flex items-start gap-3 p-4">
            <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#003087] font-bold italic text-white">P</span>
            <div class="text-sm text-on-surface-variant">
              <div class="font-semibold text-on-surface">Paga de forma segura con PayPal</div>
              Te llevamos a PayPal para aprobar el pago y vuelves a la tienda. El pedido se confirma cuando PayPal valida el cobro.
            </div>
          </div>
          <div *ngIf="pago.tipo==='Tarjeta'" class="grid gap-x-5 gap-y-5 sm:grid-cols-2">
            <div class="sm:col-span-2"><label class="lbl" for="ptitular"><span class="material-symbols-outlined">person</span>Titular de la tarjeta</label><input id="ptitular" [class.!border-red-500]="vPago.error(pago,'titular')" class="input-field" [(ngModel)]="pago.titular" (blur)="vPago.tocar('titular')" name="ptitular" autocomplete="off">
              <app-field-error [message]="vPago.error(pago,'titular')" /></div>
            <div class="sm:col-span-2"><label class="lbl" for="pcard"><span class="material-symbols-outlined">credit_card</span>Número de tarjeta <span class="font-normal normal-case text-on-surface-variant">(simulado)</span></label><input id="pcard" [class.!border-red-500]="vCard.error(card,'numero')" class="input-field" [(ngModel)]="card.numero" (blur)="vCard.tocar('numero')" name="pcard" maxlength="19" autocomplete="off" inputmode="numeric" (input)="formatCard()">
              <app-field-error [message]="vCard.error(card,'numero')" /></div>
            <div><label class="lbl" for="pexp"><span class="material-symbols-outlined">event</span>Vencimiento</label><input id="pexp" [class.!border-red-500]="vCard.error(card,'exp')" class="input-field" [(ngModel)]="card.exp" (blur)="vCard.tocar('exp')" name="pexp" placeholder="MM/AA" maxlength="5" autocomplete="off" inputmode="numeric">
              <app-field-error [message]="vCard.error(card,'exp')" /></div>
            <div><label class="lbl" for="pcvv"><span class="material-symbols-outlined">lock</span>CVV</label><input id="pcvv" [class.!border-red-500]="vCard.error(card,'cvv')" class="input-field" [(ngModel)]="card.cvv" (blur)="vCard.tocar('cvv')" name="pcvv" maxlength="4" autocomplete="off" inputmode="numeric">
              <app-field-error [message]="vCard.error(card,'cvv')" /></div>
            <div *ngIf="cardError" class="text-sm text-status-urgent sm:col-span-2">{{cardError}}</div>
          </div>
          <div *ngIf="pago.tipo==='Transferencia'" class="text-sm text-on-surface-variant">Te damos una referencia para confirmar tu pedido.</div>
        </section>

        <div *ngIf="error" class="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{{error}}</div>

        <!-- Confirmación -->
        <section *ngIf="success" class="rounded-2xl border bg-white p-6 shadow-sm" [ngClass]="confirmed ? 'border-green-200' : cancelled ? 'border-separator-hairline-light' : 'border-amber-300'" aria-labelledby="paso-conf">
          <div class="flex items-center gap-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white" [ngClass]="confirmed ? 'bg-status-delivered' : cancelled ? 'bg-slate-400' : 'bg-status-in-transit'"><span class="material-symbols-outlined text-[20px]">{{ confirmed ? 'check' : cancelled ? 'close' : 'hourglass_top' }}</span></span>
            <h2 id="paso-conf" class="text-lg font-bold" [ngClass]="confirmed ? 'text-status-delivered' : cancelled ? 'text-on-surface-variant' : 'text-status-in-transit'">{{ confirmed ? '¡Pedido confirmado!' : cancelled ? 'Pago cancelado' : 'Falta confirmar tu pago' }}</h2>
          </div>
          <p class="mt-2 text-sm text-on-surface-variant">{{ confirmed ? 'Pago realizado con éxito. Te avisaremos cuando salga a ruta.' : cancelled ? 'No se realizó ningún cobro y tus productos quedaron libres.' : 'Tu pedido está reservado, pero todavía no está pagado. Pulsa «Confirmar pago» antes de que expire para completarlo.' }}</p>
          <div class="mt-4 grid gap-1 text-sm">
            <div><span class="text-on-surface-variant">Número:</span> <strong>{{success.numeroOrden || success.ordenId}}</strong></div>
            <div><span class="text-on-surface-variant">Estado:</span> {{ humanizar(confirmed ? 'Pagado' : cancelled ? 'Cancelado' : success.estadoOrden) }} · <span class="text-on-surface-variant">Total:</span> <span class="tabular-nums">\${{(success.totalPagado ?? success.total ?? 0) | number:'1.2-2'}}</span></div>
            <div *ngIf="success.referenciaPago"><span class="text-on-surface-variant">Referencia:</span> {{success.referenciaPago}}</div>
            <div *ngIf="success.codigoRetiro"><span class="text-on-surface-variant">Código de retiro:</span> <strong>{{success.codigoRetiro}}</strong></div>
            <div *ngIf="success.pedidoLogisticoId"><span class="text-on-surface-variant">Seguimiento:</span> {{success.pedidoLogisticoId}} ({{success.estadoSeguimiento || 'Pendiente'}})</div>
            <div *ngIf="success.expiraEn"><span class="text-on-surface-variant">Expira:</span> {{success.expiraEn | date:'medium'}} <span *ngIf="remainingSec>0" class="tabular-nums">(restan {{remainingSec}}s)</span><span *ngIf="remainingSec<=0" class="font-semibold text-status-urgent"> (expirada)</span></div>
          </div>

          <div class="mt-5">
            <div class="mb-2 flex items-center justify-between">
              <ng-container *ngFor="let s of ['Confirmado','Preparando','En camino','Entregado']; let i=index; let last=last">
                <div class="flex flex-1 flex-col items-center gap-1">
                  <div class="h-2.5 w-2.5 rounded-full" [ngClass]="confirmed && i <= progressStep() ? 'bg-primary' : 'bg-separator-hairline-light'"></div>
                  <span class="font-caption text-center text-on-surface-variant">{{s}}</span>
                </div>
                <div *ngIf="!last" class="-mt-5 h-[2px] flex-1" [ngClass]="confirmed && i < progressStep() ? 'bg-primary' : 'bg-separator-hairline-light'"></div>
              </ng-container>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap gap-2" *ngIf="!confirmed && !cancelled">
            <button class="btn-primary" (click)="confirmarPago()" [disabled]="processing">{{processing?'Procesando...':'Confirmar pago'}}</button>
            <button class="btn-ghost" (click)="cancelarPago()" [disabled]="processing">Cancelar</button>
          </div>
          <div *ngIf="confirmed" class="mt-3 text-sm font-medium text-status-delivered">Pago confirmado. Tu pedido avanza al siguiente paso.</div>
          <div *ngIf="cancelled" class="mt-3 text-sm font-medium text-status-in-transit">Pago cancelado.</div>
          <button class="btn-secondary-soft mt-4" (click)="goOrders()">Ver mis pedidos</button>
        </section>
      </div>

      <!-- Resumen -->
      <aside class="space-y-4 lg:sticky lg:top-24 lg:col-span-4" aria-label="Resumen del pedido">
        <div class="space-y-5 rounded-2xl border border-separator-hairline-light bg-white p-6 shadow-lg shadow-slate-200/50">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 class="text-lg font-bold leading-tight">Resumen de compra</h2>
              <p class="text-xs text-on-surface-variant">{{cart.count()}} {{ cart.count()===1 ? 'producto' : 'productos' }} en tu orden</p>
            </div>
            <span class="rounded-full border border-[#D9BDF2] bg-primary-fixed px-2.5 py-1 text-xs font-bold text-deep">{{cart.count()}} {{ cart.count()===1 ? 'artículo' : 'artículos' }}</span>
          </div>

          <ul class="divide-y divide-slate-100">
            <li *ngFor="let i of cart.items(); let first=first" class="flex items-center gap-3.5 py-3" [class.pt-0]="first">
              <div class="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-separator-hairline-light bg-system-background p-1">
                <img *ngIf="i.imagenPrincipalUrl || i.imagenUrl" [src]="i.imagenPrincipalUrl || i.imagenUrl" [alt]="i.nombre || ''" class="h-full w-full object-contain" />
                <span *ngIf="!(i.imagenPrincipalUrl || i.imagenUrl)" class="material-symbols-outlined text-on-surface-variant">inventory_2</span>
                <span class="absolute bottom-1 right-1 rounded bg-slate-900/80 px-1.5 text-[10px] font-bold text-white">x{{i.cantidad}}</span>
              </div>
              <div class="min-w-0 flex-1"><h3 class="line-clamp-2 text-sm font-bold leading-snug">{{i.nombre || i.productoId}}</h3></div>
              <span class="text-sm font-bold tabular-nums">\${{((i.subtotal ?? ((i.precioAplicado ?? i.precioUnitario ?? i.precioOferta ?? i.precioBase ?? 0)*i.cantidad))) | number:'1.2-2'}}</span>
            </li>
          </ul>

          <div class="space-y-2.5 border-t border-slate-100 pt-4 text-sm">
            <div class="flex items-center justify-between text-on-surface-variant"><span>Subtotal de productos</span><span class="font-medium tabular-nums text-on-surface">\${{cart.subtotal() | number:'1.2-2'}}</span></div>
            <div class="flex items-center justify-between text-on-surface-variant"><span>{{ tipoEntrega==='RetiroTienda' ? 'Retiro en tienda' : 'Envío a domicilio' }}</span><span class="font-bold" [class.text-status-delivered]="tipoEntrega==='RetiroTienda'">{{ tipoEntrega==='RetiroTienda' ? 'Gratis' : 'Según cobertura' }}</span></div>
            <div class="flex items-baseline justify-between border-t border-separator-hairline-light pt-3">
              <span class="text-base font-bold">Total a pagar</span>
              <span class="text-3xl font-extrabold tabular-nums tracking-tight text-primary">\${{cart.subtotal() | number:'1.2-2'}}</span>
            </div>
          </div>

          <div *ngIf="cart.cart()?.requiereRevision" class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Hay cambios en tu carrito. Actualiza los totales antes de pagar.</div>

          <div class="space-y-3 pt-1" *ngIf="!success">
            <button class="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-white shadow-md shadow-primary/25 transition-all hover:bg-deep active:scale-[0.99] disabled:opacity-45" (click)="submit()" [disabled]="processing || cart.items().length===0">
              <span>{{ processing && pago.tipo==='PayPal' ? 'Redirigiendo a PayPal...' : pago.tipo==='PayPal' ? 'Pagar con PayPal' : 'Confirmar y pagar' }}</span>
              <span class="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
            <button class="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-on-surface-variant hover:text-on-surface" (click)="refreshQuote()"><span class="material-symbols-outlined text-[18px]">refresh</span>Actualizar totales</button>
          </div>
        </div>

        <div class="flex items-center gap-3 rounded-xl border border-separator-hairline-light bg-white p-4 shadow-sm">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-fixed text-primary"><span class="material-symbols-outlined text-[20px]">{{ tipoEntrega==='Domicilio' ? 'local_shipping' : 'storefront' }}</span></span>
          <div class="min-w-0">
            <p class="truncate text-xs font-bold">{{ tipoEntrega==='Domicilio' ? 'Entrega a domicilio' : 'Retiro en tienda' }}</p>
            <p class="truncate text-xs text-on-surface-variant">{{ resumenEntrega() }}</p>
          </div>
        </div>
      </aside>
    </div>
  </section>
  `,
})
export class CheckoutPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl?: ElementRef<HTMLDivElement>;
  private readonly toast = inject(ToastService);
  private readonly cov = inject(CoverageService);
  private readonly auth = (() => { try { return inject(AuthService); } catch { return null; } })();
  readonly metodos = [
    { id: 'PayPal', icono: 'account_balance_wallet' },
    { id: 'Tarjeta', icono: 'credit_card' },
    { id: 'Transferencia', icono: 'account_balance' },
  ];
  tipoEntrega: 'RetiroTienda' | 'Domicilio' = 'Domicilio';
  retiro = { cedulaQuienRetira: '', nombreQuienRetira: '', telefonoContacto: '', fechaRetiro: '', franjaHoraria: '' };
  domicilio = { destinatarioNombre: '', destinatarioTelefono: '', direccionTexto: '', latitud: null as number | null, longitud: null as number | null, fechaEntrega: '', horaEntrega: '', observaciones: '' };
  pago: any = { tipo: 'PayPal', titular: '', ultimos4: '', referenciaSimulada: '' };
  card = { numero: '', exp: '', cvv: '' }; cardError = '';
  vRetiro = new FormValidator<typeof this.retiro>({
    nombreQuienRetira: nombrePersona('El nombre de quien retira'),
    cedulaQuienRetira: cedula,
    telefonoContacto: telefono,
    fechaRetiro: fechaNoPasada('fecha de retiro'),
    franjaHoraria: compose(required('Indica la franja horaria de retiro.'), minLen(3, 'La franja horaria es muy corta (ej. 10:00 - 12:00).'), maxLen(50, 'La franja horaria es demasiado larga.')),
  });
  vDom = new FormValidator<typeof this.domicilio>({
    destinatarioNombre: nombrePersona('El nombre del destinatario'),
    destinatarioTelefono: telefono,
    direccionTexto: compose(required('La dirección es obligatoria.'), minLen(5, 'Describe mejor la dirección (mínimo 5 caracteres).'), maxLen(250, 'La dirección no puede superar los 250 caracteres.')),
    fechaEntrega: fechaNoPasada('fecha de entrega'),
    horaEntrega: horaEntrega((f) => f.fechaEntrega),
    observaciones: maxLen(300, 'Las observaciones no pueden superar los 300 caracteres.'),
  });
  vPago = new FormValidator<any>({
    titular: (v, f) => (f.tipo === 'Tarjeta' ? nombrePersona('El nombre del titular')(v, f) : null),
  });
  vCard = new FormValidator<typeof this.card>({ numero: numeroTarjeta, exp: vencimientoTarjeta, cvv });
  zonas: any[] = []; coberturaMsg = ''; coberturaOk = false;
  map?: L.Map; marker?: L.Marker; polygons: L.Polygon[] = [];
  error = ''; success?: CheckoutResponse; processing = false; confirmed = false; cancelled = false;
  checkoutFirma = '';
  checkoutKey = `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  confirmKey = `confirm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  cancelKey = `cancel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  remainingSec = 0; timer?: any;

  constructor(public cart: CartService, private catalog: CatalogService, private orders: OrderService, private router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    const entrega = this.route.snapshot.queryParamMap.get('entrega');
    if (entrega === 'RetiroTienda' || entrega === 'Domicilio') this.tipoEntrega = entrega;
    // Precarga con los datos de la cuenta para que el cliente no los escriba de nuevo.
    const u = this.auth?.user();
    if (u) {
      this.domicilio.destinatarioNombre ||= u.nombreCompleto ?? '';
      this.domicilio.destinatarioTelefono ||= u.telefono ?? '';
      this.retiro.nombreQuienRetira ||= u.nombreCompleto ?? '';
      this.retiro.telefonoContacto ||= u.telefono ?? '';
    }
    this.cart.cotizacion().subscribe({ error: () => this.cart.load().subscribe({ error: () => {} }) });
    // GET /api/zonas es solo para admin; las zonas activas se leen del endpoint público /api/zonas/cobertura.
    // La validación definitiva sigue en el backend (422 si no hay cobertura).
    this.catalog.getZonasCobertura().subscribe({
      next: (zonas) => { this.zonas = zonas ?? []; this.drawZones(); if (this.domicilio.latitud != null) this.validateCoverage(); this.cdr.markForCheck(); },
      error: () => { this.zonas = []; },
    });
  }
  ngAfterViewInit() { if (this.tipoEntrega === 'Domicilio') setTimeout(() => this.initMap(), 0); }
  ngOnDestroy() { if (this.timer) clearInterval(this.timer); this.map?.remove(); }

  /** Paso 1 listo: datos válidos y, si es domicilio, ubicación con cobertura. */
  pasoEntregaOk(): boolean {
    if (this.tipoEntrega === 'RetiroTienda') return this.vRetiro.esValido(this.retiro);
    return this.vDom.esValido(this.domicilio) && this.domicilio.latitud != null && this.coberturaOk;
  }
  resumenEntrega(): string {
    if (this.tipoEntrega === 'RetiroTienda') return 'Retiro gratis en Universidad Técnica de Ambato / Hub Metropolitano';
    const z = this.cov.zona()?.nombre;
    if (this.domicilio.latitud == null) return 'Marca tu ubicación en el mapa';
    return this.coberturaOk ? (z ? 'Entrega a ' + z : 'Ubicación con cobertura') : 'Esa ubicación no tiene cobertura';
  }
  /** Usa la ubicación del dispositivo para marcar el punto de entrega. */
  usarGps() {
    if (!navigator.geolocation) { this.toast.warning('Tu navegador no permite obtener la ubicación. Márcala en el mapa.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { this.map?.setView([pos.coords.latitude, pos.coords.longitude], 16); this.setPoint(pos.coords.latitude, pos.coords.longitude); },
      () => this.toast.warning('No pudimos obtener tu ubicación. Revisa el permiso del navegador o márcala en el mapa.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }
  setTipo(t: 'RetiroTienda' | 'Domicilio') { this.tipoEntrega = t; this.onTipoChange(); }
  onTipoChange() { if (this.tipoEntrega === 'Domicilio') setTimeout(() => this.initMap(), 0); }
  refreshQuote() { this.cart.cotizacion().subscribe({ next: () => {}, error: () => this.cart.load().subscribe({ error: () => {} }) }); }

  initMap() {
    configurarIconosLeaflet();
    if (this.map || !this.mapEl) return;
    this.map = L.map(this.mapEl.nativeElement).setView([-1.2416, -78.6197], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(this.map);
    this.map.on('click', (e: any) => this.setPoint(e.latlng.lat, e.latlng.lng));
    this.drawZones();
    const previo = this.cov.punto();
    if (previo && this.domicilio.latitud == null) { this.map.setView([previo.lat, previo.lng], 15); this.setPoint(previo.lat, previo.lng); }
    setTimeout(() => this.map?.invalidateSize(), 100);
  }
  drawZones() {
    if (!this.map) return;
    this.polygons.forEach(p => p.remove()); this.polygons = [];
    this.zonas.filter(z => z?.activa !== false).forEach((z) => {
      const pts = (z.poligono || z.coordenadas || []).map((p: any) => [p.latitud ?? p.lat ?? p.latitude, p.longitud ?? p.lng ?? p.lon ?? p.longitude]);
      if (pts.length >= 3) this.polygons.push(L.polygon(pts as any, { color: '#6A1B9A', weight: 1, fillOpacity: 0.08 }).addTo(this.map!));
    });
    if (this.polygons.length && !this.marker) this.map.fitBounds(L.featureGroup(this.polygons).getBounds(), { padding: [20, 20] });
  }
  setPoint(lat: number, lng: number) {
    this.domicilio.latitud = +lat.toFixed(6); this.domicilio.longitud = +lng.toFixed(6); this.cdr.markForCheck();
    if (!this.map) return;
    if (!this.marker) this.marker = L.marker([lat, lng], { icon: iconoCasa() }).addTo(this.map); else this.marker.setLatLng([lat, lng]);
    this.cov.fijar(lat, lng);
    this.validateCoverage();
  }
  validateCoverage() {
    const lat = this.domicilio.latitud, lng = this.domicilio.longitud;
    if (lat == null || lng == null) { this.coberturaOk = false; this.coberturaMsg = 'Selecciona un punto en el mapa para validar tu dirección.'; return false; }
    const active = this.zonas.filter(z => z?.activa !== false);
    if (active.length === 0) { this.coberturaOk = true; this.coberturaMsg = 'Validaremos la cobertura de tu dirección al confirmar el pedido.'; return true; }
    const ok = active.some((z) => {
      const poly = (z.poligono || z.coordenadas || []).map((p: any) => ({ latitud: p.latitud ?? p.lat ?? p.latitude, longitud: p.longitud ?? p.lng ?? p.lon ?? p.longitude }));
      return poly.length >= 3 && puntoEnPoligono(lat, lng, poly);
    });
    this.coberturaOk = ok;
    this.coberturaMsg = ok ? 'Disponible para envío hoy a tu zona.' : 'Por ahora no llegamos a ese punto. Prueba con otra ubicación dentro de la zona de cobertura.';
    return ok;
  }

  formatCard() { this.card.numero = this.card.numero.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim(); }
  validateCard(): boolean {
    if (this.pago.tipo !== 'Tarjeta') return true;
    const digits = this.card.numero.replace(/\s+/g,'');
    if (digits.length < 12 || !/^\d{2}\/\d{2}$/.test(this.card.exp) || !/^\d{3,4}$/.test(this.card.cvv)) {
      this.cardError = 'Revisa los datos de la tarjeta (número, MM/AA y CVV) para continuar.'; return false;
    }
    this.cardError = ''; this.pago.ultimos4 = digits.slice(-4); this.pago.referenciaSimulada = 'PAY-' + Math.floor(Math.random()*900000+100000);
    return true;
  }

  private camposFaltantes(): string {
    const vacio = (v: any) => v == null || String(v).trim() === '';
    if (this.tipoEntrega === 'RetiroTienda') {
      const r = this.retiro;
      if ([r.cedulaQuienRetira, r.nombreQuienRetira, r.telefonoContacto, r.fechaRetiro, r.franjaHoraria].some(vacio)) return 'Completa todos los datos de retiro: cédula, nombre, teléfono, fecha y franja horaria.';
    } else {
      const d = this.domicilio;
      if ([d.destinatarioNombre, d.destinatarioTelefono, d.direccionTexto, d.fechaEntrega, d.horaEntrega].some(vacio)) return 'Completa los datos de entrega: destinatario, teléfono, dirección, fecha y hora.';
    }
    return '';
  }

  submit() {
    this.error = '';
    if (this.cart.cart()?.requiereRevision) { this.error = 'Detectamos cambios en tu bolsa. Actualiza los totales antes de pagar.'; return; }
    const okForm = this.tipoEntrega === 'RetiroTienda' ? this.vRetiro.validar(this.retiro) : this.vDom.validar(this.domicilio);
    const okPago = this.pago.tipo !== 'Tarjeta' || (this.vPago.validar(this.pago) && this.vCard.validar(this.card));
    if (!okForm || !okPago) { this.error = ''; this.toast.warning('Revisa los campos marcados en rojo antes de continuar.'); this.cdr.markForCheck(); return; }
    this.error = '';
    if (this.tipoEntrega === 'Domicilio' && !this.validateCoverage()) { this.error = this.coberturaMsg; return; }
    if (!this.validateCard()) return;
    const items = this.cart.items().map(i => ({ productoId: i.productoId, cantidad: i.cantidad }));
    const metodoPago = this.pago.tipo === 'PayPal' ? { tipo: 'PayPal', titular: null, ultimos4: null, referenciaSimulada: null } : this.pago;
    const payload: any = { items, tipoEntrega: this.tipoEntrega, metodoPago, datosRetiroTienda: null, datosDomicilio: null };
    if (this.tipoEntrega === 'RetiroTienda') payload.datosRetiroTienda = this.retiro;
    else payload.datosDomicilio = { ...this.domicilio, observaciones: this.domicilio.observaciones || '', horaEntrega: this.domicilio.horaEntrega?.length === 5 ? this.domicilio.horaEntrega + ':00' : this.domicilio.horaEntrega };

    const snapshot = this.cart.items().map(i => ({ productoId: i.productoId, nombre: i.nombre || i.productoId, cantidad: i.cantidad, precio: i.precioAplicado ?? i.precioUnitario ?? i.precioOferta ?? i.precioBase ?? 0, imagenUrl: i.imagenPrincipalUrl ?? i.imagenUrl ?? null }));
    // La clave de idempotencia solo se reutiliza si el pedido es idéntico (doble clic). Si el cliente cambia
    // método de pago o datos, se genera otra; si no, el backend devolvería la orden anterior (p. ej. PayPal).
    const firma = JSON.stringify(payload);
    if (firma !== this.checkoutFirma) { this.checkoutFirma = firma; this.checkoutKey = `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
    this.processing = true;
    if (this.pago.tipo === 'PayPal') this.toast.info('Creando tu pedido… te redirigiremos a PayPal para pagar.');
    this.orders.checkout(payload, this.checkoutKey).subscribe({
      next: (res) => {
        this.orders.guardarDetalle(res.ordenId, snapshot);
        if (this.pago.tipo === 'PayPal') { this.iniciarPayPal(res.ordenId); return; }
        this.success = res; this.processing = false; this.cdr.markForCheck(); this.startExpiryTimer(res.expiraEn); this.cart.clearLocal();
        this.toast.success('Pedido creado correctamente. Confirma el pago para finalizar tu compra.');
      },
      error: (e) => {
        this.processing = false; this.cdr.markForCheck();
        const code = e?.code || e?.problem?.codigo;
        if (e?.status === 409 && code === 'STOCK_AGOTADO') {
          const p = e?.problem;
          this.error = `Lo sentimos, ${p?.mensaje || 'un artículo de tu bolsa acaba de agotarse o cambió su disponibilidad.'}${p?.stockDisponible != null ? ` (disponible: ${p.stockDisponible})` : ''} Actualizamos tu bolsa para que puedas continuar.`;
          this.cart.cotizacion().subscribe({ error: () => this.cart.load().subscribe({ error: () => {} }) });
        } else if (e?.status === 403) {
          this.error = 'Tu cuenta no tiene permisos de Cliente para realizar compras.';
        } else if (e?.status === 404) {
          this.error = 'Un producto de tu bolsa ya no existe. Actualizamos tu bolsa para que revises.';
          this.cart.load().subscribe({ error: () => {} });
        } else if (e?.status === 422) {
          this.error = e?.userMessage || 'No podemos entregar en esa dirección. Prueba seleccionando otro punto dentro de la zona de cobertura.';
        } else if (e?.status === 409 && code === 'PAGO_NO_CONFIRMABLE') {
          this.error = 'La reserva de tu pedido expiró o ya no es confirmable. Te invitamos a iniciar un nuevo checkout.';
        } else {
          this.error = e?.userMessage || 'No pudimos procesar tu pedido en este momento. Inténtalo nuevamente.';
        }
        this.toast.error(this.error);
      },
    });
  }

  private iniciarPayPal(ordenId: string) {
    guardarPayPalPendiente(ordenId);
    this.orders.crearOrdenPayPal(ordenId).subscribe({
      next: (r) => {
        if (!r?.urlAprobacion) { this.processing = false; this.cdr.markForCheck(); this.error = 'PayPal no devolvió un enlace de aprobación. Inténtalo nuevamente.'; return; }
        guardarPayPalPendiente(ordenId, r.payPalOrderId);
        window.location.assign(r.urlAprobacion);
      },
      error: (e) => {
        this.processing = false; this.cdr.markForCheck();
        borrarPayPalPendiente();
        this.error = e?.userMessage || 'No pudimos iniciar el pago con PayPal. Inténtalo nuevamente.'; this.toast.error(this.error);
      },
    });
  }

  confirmarPago() {
    if (!this.success?.ordenId) return;
    this.processing = true;
    this.orders.confirmarPago(this.success.ordenId, this.confirmKey).subscribe({
      next: (res: any) => { this.processing = false; this.cdr.markForCheck(); this.confirmed = true; this.success = { ...this.success!, ...res }; this.toast.success('¡Pago realizado con éxito! Tu pedido fue confirmado.'); },
      error: (e) => {
        this.processing = false; this.cdr.markForCheck();
        const code = e?.code || e?.problem?.codigo;
        this.error = code === 'PAGO_NO_CONFIRMABLE' ? 'La reserva expiró o fue liberada. Por favor, realiza un nuevo checkout.' : (e?.userMessage || 'No pudimos confirmar el pago. Inténtalo nuevamente.');
        this.toast.error(this.error);
      },
    });
  }
  cancelarPago() {
    if (!this.success?.ordenId) return;
    this.processing = true;
    this.orders.cancelarPago(this.success.ordenId, this.cancelKey).subscribe({
      next: (res: any) => { this.processing = false; this.cdr.markForCheck(); this.cancelled = true; this.success = { ...this.success!, ...res }; this.toast.info('Pago cancelado. No se realizó ningún cobro.'); },
      error: (e) => { this.processing = false; this.cdr.markForCheck(); this.error = e?.userMessage || 'No pudimos cancelar el pago en este momento.'; this.toast.error(this.error); },
    });
  }

  progressStep() { return this.confirmed ? 1 : 0; }
  humanizar(v?: string | null) { return (v ?? 'Pendiente de pago').replace(/([a-z])([A-Z])/g, '$1 $2'); }
  startExpiryTimer(expiraEn?: string) {
    if (!expiraEn) return;
    const end = new Date(expiraEn).getTime();
    const tick = () => { this.remainingSec = Math.max(0, Math.floor((end - Date.now()) / 1000)); this.cdr.markForCheck(); };
    tick(); this.timer = setInterval(tick, 1000);
  }
  goOrders() { this.router.navigateByUrl('/mis-pedidos'); }
}
