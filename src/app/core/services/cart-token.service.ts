import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class CartTokenService {
  constructor(private storage: StorageService) {}

  get(): string | null {
    return this.storage.get<string>(environment.cartTokenStorageKey);
  }

  set(token: string | null | undefined) {
    if (!token) return;
    this.storage.set(environment.cartTokenStorageKey, token);
  }

  clear() {
    this.storage.remove(environment.cartTokenStorageKey);
  }
}
