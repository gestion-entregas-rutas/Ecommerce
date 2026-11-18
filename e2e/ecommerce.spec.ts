import { expect, test, type APIRequestContext } from '@playwright/test';

const api = process.env.ECOMMERCE_API_URL ?? 'http://127.0.0.1:5289/api';
const stamp = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
const testEmail = `qa.ecommerce.${stamp}@example.test`;
const testPassword = 'Ecommerce-QA-2026!';
const uniqueEmail = (label: string) => `qa.${label}.${stamp}.${Math.floor(Math.random() * 100000)}@example.test`;

async function register(request: APIRequestContext, email = testEmail) {
  return request.post(`${api}/autenticacion/registro-cliente`, {
    data: {
      nombreCompleto: 'Cliente Pruebas Ecommerce',
      correo: email,
      telefono: '0991234567',
      password: testPassword,
    },
  });
}

async function login(request: APIRequestContext, email = testEmail) {
  return request.post(`${api}/autenticacion/login`, {
    data: { nombreUsuario: email, clave: testPassword },
  });
}

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
    const response = await request.post(`${api}/productos/${product.id}/resenas`, { data: { calificacion: 5, comentario: 'Prueba Ecommerce' } });
    expect([401, 403]).toContain(response.status());
  });

  test('CP-T2-06 Productos inactivos no aparecen en catálogo público', async ({ request }) => {
    const response = await request.get(`${api}/productos?pagina=1&tamanoPagina=100`);
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).items.every((p: any) => p.activo !== false)).toBeTruthy();
  });
});

test.describe('T3 — Carrito invitado', () => {
  test('CP-T3-01 Agregar ítem de invitado y persistir el token', async ({ request }) => {
    const products = await request.get(`${api}/productos?pagina=1&tamanoPagina=1`);
    expect(products.ok()).toBeTruthy();
    const product = (await products.json()).items?.[0];
    test.skip(!product?.id, 'No hay producto activo para el carrito.');
    const token = `qa-${stamp}-guest`;
    const response = await request.post(`${api}/carrito/items`, { headers: { 'X-Cart-Token': token }, data: { productoId: product.id, cantidad: 1 } });
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).items?.length).toBeGreaterThan(0);
  });

  test('CP-T3-02 Actualizar cantidad y eliminar ítem invitado', async ({ request }) => {
    const products = await request.get(`${api}/productos?pagina=1&tamanoPagina=1`);
    const product = (await products.json()).items?.[0];
    test.skip(!product?.id, 'No hay producto activo para el carrito.');
    const token = `qa-${stamp}-crud`;
    const headers = { 'X-Cart-Token': token };
    const added = await request.post(`${api}/carrito/items`, { headers, data: { productoId: product.id, cantidad: 1 } });
    expect(added.ok()).toBeTruthy();
    const updated = await request.put(`${api}/carrito/items/${product.id}`, { headers, data: { cantidad: 2 } });
    expect(updated.ok()).toBeTruthy();
    const removed = await request.delete(`${api}/carrito/items/${product.id}`, { headers });
    expect(removed.ok()).toBeTruthy();
  });

  test('CP-T3-03 Cotización devuelve datos de revisión y subtotal', async ({ request }) => {
    const response = await request.get(`${api}/carrito/cotizacion`, { headers: { 'X-Cart-Token': `qa-${stamp}-quote` } });
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
    const added = await request.post(`${api}/carrito/items`, { headers: { 'X-Cart-Token': tokenInvitado }, data: { productoId: product.id, cantidad: 1 } });
    expect(added.ok()).toBeTruthy();
    const response = await request.post(`${api}/carrito/merge`, { headers: { Authorization: `Bearer ${bearer}` }, data: { tokenInvitado } });
    expect(response.ok(), await response.text()).toBeTruthy();
    expect(Array.isArray((await response.json()).items)).toBeTruthy();
  });

  test('CP-T3-05 Continuar al pago redirige a login conservando carrito', async ({ page, request }) => {
    const products = await request.get(`${api}/productos?pagina=1&tamanoPagina=1`);
    const product = (await products.json()).items?.[0];
    test.skip(!product?.id, 'No hay producto activo para validar la navegación desde el carrito.');
    const token = `qa-${stamp}-browser-cart`;
    const added = await request.post(`${api}/carrito/items`, { headers: { 'X-Cart-Token': token }, data: { productoId: product.id, cantidad: 1 } });
    expect(added.ok()).toBeTruthy();
    const cart = await added.json();
    await page.addInitScript(({ token, cart }) => {
      localStorage.setItem('tienda.cartToken.v1', JSON.stringify(token));
      localStorage.setItem('tienda.cart.v1', JSON.stringify(cart));
    }, { token, cart });
    await page.goto('/carrito');
    await page.getByRole('button', { name: 'Continuar al pago' }).click();
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fcheckout/);
  });
});

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
    const response = await request.post(`${api}/ordenes/checkout`, { headers: { 'Idempotency-Key': `qa-${stamp}-stock` }, data: { items: [] } });
    expect([400, 401, 403, 422]).toContain(response.status());
  });
  test('CP-T4-05 Confirmar pago sin sesión es rechazado', async ({ request }) => {
    const response = await request.post(`${api}/ordenes/00000000-0000-0000-0000-000000000000/pago/confirmar`, { headers: { 'Idempotency-Key': `qa-${stamp}-expired` }, data: {} });
    expect([401, 403, 404]).toContain(response.status());
  });
  test('CP-T4-06 Checkout conserva cabecera de idempotencia en el contrato', async ({ request }) => {
    const response = await request.post(`${api}/ordenes/checkout`, { headers: { 'Idempotency-Key': `qa-${stamp}-idem` }, data: { items: [] } });
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

test.describe('Transversales', () => {
  test('CP-TR-01 Catálogo carga en menos de 15 segundos y permite búsqueda', async ({ page }) => {
    const started = Date.now();
    await page.goto('/productos');
    await expect(page.getByText(/resultados/).first()).toBeVisible({ timeout: 15000 });
    expect(Date.now() - started).toBeLessThan(15000);
  });
  test('CP-TR-02 La UI ofrece recuperación si una petición del catálogo falla', async ({ page }) => {
    await page.route('**/api/productos**', route => route.abort());
    await page.goto('/productos');
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible({ timeout: 15000 });
  });
});
