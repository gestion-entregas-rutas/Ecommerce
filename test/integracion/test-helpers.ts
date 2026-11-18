import { type APIRequestContext } from '@playwright/test';

export const api = process.env.ECOMMERCE_API_URL ?? 'http://127.0.0.1:5289/api';
export const stamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
export const testEmail = `qa.ecommerce.${stamp}@example.test`;
export const testPassword = 'Ecommerce-QA-2026!';
export const uniqueEmail = (label: string) => `qa.${label}.${stamp}.${Math.floor(Math.random() * 100000)}@example.test`;

export async function register(request: APIRequestContext, email = testEmail) {
  return request.post(`${api}/autenticacion/registro-cliente`, {
    data: {
      nombreCompleto: 'Cliente Pruebas Ecommerce',
      correo: email,
      telefono: '0991234567',
      password: testPassword,
    },
  });
}

export async function login(request: APIRequestContext, email = testEmail) {
  return request.post(`${api}/autenticacion/login`, {
    data: { nombreUsuario: email, clave: testPassword },
  });
}
