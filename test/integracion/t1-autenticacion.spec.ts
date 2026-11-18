import { expect, test } from '@playwright/test';
import { api, register, login, uniqueEmail, stamp } from './test-helpers';

test.describe('T1 — Autenticación y sesión', () => {
  test('CP-T1-01 Registro de cliente válido', async ({ request }) => {
    const response = await register(request);
    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.usuario?.rol).toBe('Cliente');
  });

  test('CP-T1-02 Login y perfil de cliente', async ({ request }) => {
    const email = uniqueEmail('login');
    const created = await register(request, email);
    expect([200, 201]).toContain(created.status());
    const response = await login(request, email);
    expect(response.ok()).toBeTruthy();
    const token = (await response.json()).accessToken;
    const profile = await request.get(`${api}/autenticacion/me`, { headers: { Authorization: `Bearer ${token}` } });
    expect(profile.ok()).toBeTruthy();
    expect((await profile.json()).rol).toBe('Cliente');
  });

  test('CP-T1-03 Login inválido no entrega token', async ({ request }) => {
    const response = await request.post(`${api}/autenticacion/login`, {
      data: { usuarioOCorreo: `no-existe-${stamp}@example.test`, password: 'incorrecta' },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect((await response.text()).toLowerCase()).not.toContain('"token":"');
  });

  test('CP-T1-04 Ruta protegida conserva returnUrl', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login\?returnUrl=.*checkout/);
  });

  test('CP-T1-05 Logout invalida la sesión y bloquea rutas protegidas', async ({ page, request }) => {
    const email = uniqueEmail('logout');
    const created = await register(request, email);
    expect([200, 201]).toContain(created.status());
    const session = await created.json();
    const headers = { Authorization: `Bearer ${session.accessToken}` };
    const logout = await request.post(`${api}/autenticacion/logout`, { headers, data: {} });
    expect(logout.status()).toBe(204);
    const profile = await request.get(`${api}/autenticacion/me`, { headers });
    expect([401, 403]).toContain(profile.status());
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login\?returnUrl=.*checkout/);
  });
});
