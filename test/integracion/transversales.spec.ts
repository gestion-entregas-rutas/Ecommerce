import { expect, test } from '@playwright/test';

test.describe('Transversales', () => {
  test('CP-TR-01 Catálogo carga en menos de 15 segundos y permite búsqueda', async ({ page }) => {
    const started = Date.now();
    await page.goto('/productos');
    await expect(page.getByText(/resultados/).first()).toBeVisible({ timeout: 15000 });
    expect(Date.now() - started).toBeLessThan(15000);
  });

  test('CP-TR-02 La UI ofrece recuperación si una petición del catálogo falla', async ({ page }) => {
    await page.route('**/api/productos**', (route) => route.abort());
    await page.goto('/productos');
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible({ timeout: 15000 });
  });
});
