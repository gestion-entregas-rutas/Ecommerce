import { expect, test } from '@playwright/test';
import { api } from './test-helpers';

test.describe('T5 — Historial y seguimiento', () => {
  test('CP-T5-01 Mis pedidos requiere autenticación', async ({ page }) => {
    await page.goto('/mis-pedidos');
    await expect(page).toHaveURL(/\/login\?returnUrl=.*mis-pedidos/);
  });

  test('CP-T5-02 Consulta de órdenes sin sesión no expone datos', async ({ request }) => {
    const response = await request.get(`${api}/ordenes/mias`);
    expect([401, 403]).toContain(response.status());
  });
});
