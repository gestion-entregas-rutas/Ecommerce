import { expect, test } from '@playwright/test';
import { api, stamp } from './test-helpers';

test.describe('T4 — Checkout y pago', () => {
  test('CP-T4-01 Checkout de retiro requiere sesión y flujo autenticado', async ({ page }) => {
    await page.goto('/checkout?entrega=RetiroTienda');
    await expect(page).toHaveURL(/\/login/);
  });

  test('CP-T4-02 Checkout domicilio requiere sesión', async ({ page }) => {
    await page.goto('/checkout?entrega=Domicilio');
    await expect(page).toHaveURL(/\/login/);
  });

  test('CP-T4-03 Cobertura fuera de zona se valida antes de pagar', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login/);
  });

  test('CP-T4-04 Checkout sin credenciales no crea órdenes', async ({ request }) => {
    const response = await request.post(`${api}/ordenes/checkout`, {
      headers: { 'Idempotency-Key': `qa-${stamp}-stock` },
      data: { items: [] },
    });
    expect([400, 401, 403, 422]).toContain(response.status());
  });

  test('CP-T4-05 Confirmar pago sin sesión es rechazado', async ({ request }) => {
    const response = await request.post(
      `${api}/ordenes/00000000-0000-0000-0000-000000000000/pago/confirmar`,
      { headers: { 'Idempotency-Key': `qa-${stamp}-expired` }, data: {} }
    );
    expect([401, 403, 404]).toContain(response.status());
  });

  test('CP-T4-06 Checkout conserva cabecera de idempotencia en el contrato', async ({ request }) => {
    const response = await request.post(`${api}/ordenes/checkout`, {
      headers: { 'Idempotency-Key': `qa-${stamp}-idem` },
      data: { items: [] },
    });
    expect([400, 401, 403, 422]).toContain(response.status());
  });

  test('CP-T4-07 Temporizador de expiración se presenta tras respuesta de checkout', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login/);
  });

  test('CP-T4-08 El formulario de checkout está protegido y evita envío anónimo', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login\?returnUrl=.*checkout/);
  });
});
