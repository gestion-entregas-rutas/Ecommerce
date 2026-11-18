import { expect, test } from '@playwright/test';
import { api } from './test-helpers';

test.describe('T2 — Catálogo y detalle', () => {
  test('CP-T2-01 Catálogo y paginación responden con estructura esperada', async ({ request, page }) => {
    const t0 = Date.now();
    const response = await request.get(`${api}/productos?pagina=1&tamanoPagina=5`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(Array.isArray(body.items)).toBeTruthy();
    expect(body.pagina).toBe(1);
    expect(Date.now() - t0).toBeLessThan(15000);
    await page.goto('/productos');
    await expect(page.getByText(/resultados/).first()).toBeVisible();
  });

  test('CP-T2-02 Búsqueda devuelve productos relevantes', async ({ request, page }) => {
    const first = await request.get(`${api}/productos?pagina=1&tamanoPagina=1`);
    expect(first.ok()).toBeTruthy();
    const product = (await first.json()).items?.[0];
    test.skip(!product?.nombre, 'El catálogo de prueba no contiene productos activos.');
    const response = await request.get(`${api}/productos?buscar=${encodeURIComponent(product.nombre)}&pagina=1&tamanoPagina=20`);
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).items.some((p: any) => p.nombre === product.nombre)).toBeTruthy();
    await page.goto('/productos');
    await page.goto(`/productos?buscar=${encodeURIComponent(product.nombre)}`);
    await expect(page.getByText(product.nombre, { exact: false }).first()).toBeVisible();
  });

  test('CP-T2-03 Filtros y orden se aceptan por la API', async ({ request }) => {
    for (const query of ['soloOfertas=true', 'orden=precio_asc', 'orden=precio_desc', 'precioMin=0&precioMax=10000']) {
      const response = await request.get(`${api}/productos?${query}&pagina=1&tamanoPagina=5`);
      expect(response.ok(), query).toBeTruthy();
    }
  });

  test('CP-T2-04 El detalle expone ficha del producto', async ({ request, page }) => {
    const list = await request.get(`${api}/productos?pagina=1&tamanoPagina=1`);
    expect(list.ok()).toBeTruthy();
    const product = (await list.json()).items?.[0];
    test.skip(!product?.id, 'El catálogo de prueba no contiene productos activos.');
    const response = await request.get(`${api}/productos/${product.id}`);
    expect(response.ok()).toBeTruthy();
    const detail = await response.json();
    expect(detail.id).toBe(product.id);
    await page.goto(`/producto/${product.id}`);
    await expect(page.locator('h1').filter({ hasText: product.nombre }).first()).toBeVisible({ timeout: 15000 });
  });

  test('CP-T2-05 Reseña sin autenticar es rechazada por autorización', async ({ request }) => {
    const list = await request.get(`${api}/productos?pagina=1&tamanoPagina=1`);
    expect(list.ok()).toBeTruthy();
    const product = (await list.json()).items?.[0];
    test.skip(!product?.id, 'No hay producto de prueba disponible.');
    const response = await request.post(`${api}/productos/${product.id}/resenas`, {
      data: { calificacion: 5, comentario: 'Prueba Ecommerce' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('CP-T2-06 Productos inactivos no aparecen en catálogo público', async ({ request }) => {
    const response = await request.get(`${api}/productos?pagina=1&tamanoPagina=100`);
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).items.every((p: any) => p.activo !== false)).toBeTruthy();
  });
});
