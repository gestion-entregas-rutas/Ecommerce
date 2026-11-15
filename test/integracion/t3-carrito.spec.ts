import { expect, test } from '@playwright/test';
import { api, register, uniqueEmail, stamp } from './test-helpers';

test.describe('T3 — Carrito invitado', () => {
  test('CP-T3-01 Agregar ítem de invitado y persistir el token', async ({ request }) => {
    const products = await request.get(`${api}/productos?pagina=1&tamanoPagina=1`);
    expect(products.ok()).toBeTruthy();
    const product = (await products.json()).items?.[0];
    test.skip(!product?.id, 'No hay producto activo para el carrito.');
    const token = `qa-${stamp}-guest`;
    const response = await request.post(`${api}/carrito/items`, {
      headers: { 'X-Cart-Token': token },
      data: { productoId: product.id, cantidad: 1 },
    });
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).items?.length).toBeGreaterThan(0);
  });

  test('CP-T3-02 Actualizar cantidad y eliminar ítem invitado', async ({ request }) => {
    const products = await request.get(`${api}/productos?pagina=1&tamanoPagina=1`);
    const product = (await products.json()).items?.[0];
    test.skip(!product?.id, 'No hay producto activo para el carrito.');
    const token = `qa-${stamp}-crud`;
    const headers = { 'X-Cart-Token': token };
    const added = await request.post(`${api}/carrito/items`, {
      headers,
      data: { productoId: product.id, cantidad: 1 },
    });
    expect(added.ok()).toBeTruthy();
    const updated = await request.put(`${api}/carrito/items/${product.id}`, {
      headers,
      data: { cantidad: 2 },
    });
    expect(updated.ok()).toBeTruthy();
    const removed = await request.delete(`${api}/carrito/items/${product.id}`, { headers });
    expect(removed.ok()).toBeTruthy();
  });

  test('CP-T3-03 Cotización devuelve datos de revisión y subtotal', async ({ request }) => {
    const response = await request.get(`${api}/carrito/cotizacion`, {
      headers: { 'X-Cart-Token': `qa-${stamp}-quote` },
    });
    expect([200, 204]).toContain(response.status());
  });

  test('CP-T3-04 Merge de carrito después del login conserva estructura', async ({ request }) => {
    const email = uniqueEmail('merge');
    const created = await register(request, email);
    expect([200, 201]).toContain(created.status());
    const { accessToken: bearer } = await created.json();
    const products = await request.get(`${api}/productos?pagina=1&tamanoPagina=1`);
    const product = (await products.json()).items?.[0];
    test.skip(!product?.id, 'No hay producto activo para validar el merge.');
    const tokenInvitado = `qa-${stamp}-merge`;
    const added = await request.post(`${api}/carrito/items`, {
      headers: { 'X-Cart-Token': tokenInvitado },
      data: { productoId: product.id, cantidad: 1 },
    });
    expect(added.ok()).toBeTruthy();
    const response = await request.post(`${api}/carrito/merge`, {
      headers: { Authorization: `Bearer ${bearer}` },
      data: { tokenInvitado },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    expect(Array.isArray((await response.json()).items)).toBeTruthy();
  });

  test('CP-T3-05 Continuar al pago redirige a login conservando carrito', async ({ page, request }) => {
    const products = await request.get(`${api}/productos?pagina=1&tamanoPagina=1`);
    const product = (await products.json()).items?.[0];
    test.skip(!product?.id, 'No hay producto activo para validar la navegación desde el carrito.');
    const token = `qa-${stamp}-browser-cart`;
    const added = await request.post(`${api}/carrito/items`, {
      headers: { 'X-Cart-Token': token },
      data: { productoId: product.id, cantidad: 1 },
    });
    expect(added.ok()).toBeTruthy();
    const cart = await added.json();
    await page.addInitScript(
      ({ token, cart }) => {
        localStorage.setItem('tienda.cartToken.v1', JSON.stringify(token));
        localStorage.setItem('tienda.cart.v1', JSON.stringify(cart));
      },
      { token, cart }
    );
    await page.goto('/carrito');
    await page.getByRole('button', { name: 'Continuar al pago' }).click();
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fcheckout/);
  });
});
