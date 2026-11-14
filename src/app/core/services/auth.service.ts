import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, UsuarioSesion } from '../models/api.models';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<UsuarioSesion | null>(null);

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal() && !!this.userSignal());
  readonly isCliente = computed(() => this.userSignal()?.rol === 'Cliente');

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private router: Router,
  ) {
    const session = this.storage.get<{ token: string; usuario: UsuarioSesion }>(environment.sessionStorageKey);
    if (session?.token && session?.usuario) {
      this.tokenSignal.set(session.token);
      this.userSignal.set(session.usuario);
    }
  }

  login(payload: { usuarioOCorreo?: string; correo?: string; usuario?: string; password: string }) {
    const body = {
      usuarioOCorreo: payload.usuarioOCorreo ?? payload.correo ?? payload.usuario,
      password: payload.password,
    };
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/autenticacion/login`, body).pipe(
      tap((res) => this.setSession(res)),
    );
  }

  registroCliente(payload: { nombreCompleto: string; correo: string; telefono: string; password: string }) {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/autenticacion/registro-cliente`, payload)
      .pipe(tap((res) => this.setSession(res)));
  }

  me() {
    return this.http.get<UsuarioSesion>(`${environment.apiBaseUrl}/autenticacion/me`).pipe(
      tap((usuario) => {
        const token = this.tokenSignal();
        if (token) this.persist(token, usuario);
        this.userSignal.set(usuario);
      }),
    );
  }

  logout(redirect = true) {
    const token = this.tokenSignal();
    if (token) {
      this.http.post(`${environment.apiBaseUrl}/autenticacion/logout`, {}).subscribe({ error: () => {} });
    }
    this.clearSession();
    if (redirect) this.router.navigateByUrl('/login');
  }

  handleUnauthorized(returnUrl?: string) {
    this.clearSession();
    const url = returnUrl ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login';
    this.router.navigateByUrl(url);
  }

  private setSession(res: AuthResponse) {
    if (!res?.token || !res?.usuario) return;
    this.persist(res.token, res.usuario);
    this.tokenSignal.set(res.token);
    this.userSignal.set(res.usuario);
  }

  private persist(token: string, usuario: UsuarioSesion) {
    this.storage.set(environment.sessionStorageKey, { token, usuario });
  }

  private clearSession() {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.storage.remove(environment.sessionStorageKey);
  }
}
