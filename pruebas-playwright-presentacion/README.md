# Recorridos Playwright de RouteOS

La carpeta está dividida en las dos aplicaciones web:

- `ecommerce/`: tienda y sus módulos de catálogo, ofertas, producto, carrito, cuenta y checkout/pedidos.
- `acceso_administrativo/`: ingreso del panel y sus módulos de Centro de Control, pedidos, productos, rutas, zonas, repartidores, retiros, usuarios y credenciales.

Los recorridos usan **Python Playwright síncrono**, abren Chromium visible (`headless=False`) y hacen pausas para poder explicar las pantallas. Los módulos administrativos navegan y filtran; no crean ni eliminan datos. Cada recorrido guarda una captura en `evidencias/`.

## Preparar Playwright (una vez)

```powershell
py -m pip install playwright
py -m playwright install chromium
```

## Servicios necesarios

- IIS activo: tienda `http://localhost:5330`, panel `http://localhost:5290` y API `http://localhost:5289`.
- PostgreSQL activo para que la API pueda mostrar datos.

## Ejecutar una prueba

Abre PowerShell en `pruebas-playwright-presentacion` y usa `-m` para ejecutar el módulo:

```powershell
py -m ecommerce.tienda_catalogo
py -m acceso_administrativo.panel_login
py -m acceso_administrativo.panel_centro_control
py -m acceso_administrativo.panel_pedidos
```

Los módulos administrativos solicitan usuario y contraseña en la terminal si no existen las variables `PRESENTACION_ADMIN_USUARIO` y `PRESENTACION_ADMIN_CLAVE`. La contraseña se solicita oculta y no se guarda en los scripts.

La prueba `py -m ecommerce.tienda_login` solicita las credenciales de un cliente Ecommerce y realiza el inicio de sesión. En `run_all.py`, primero solicitará estas credenciales cuando llegue al módulo de login, además de las credenciales administrativas. La prueba del carrito agrega hasta dos productos disponibles desde el catálogo antes de abrirlo; se necesita que el catálogo y CORS estén operativos.

## Ejecutar todos los módulos

```powershell
py run_all.py
```

El recorrido completo pide las credenciales una sola vez y después abre cada módulo en su propia ventana de Chromium. Puedes cambiar las direcciones con las variables `PRESENTACION_TIENDA_URL` y `PRESENTACION_ADMIN_URL`.

## Evidencia

Las capturas quedan en `evidencias/`. Estos scripts son recorridos visuales para presentación, al estilo de la demostración compartida; no sustituyen pruebas funcionales automatizadas con aserciones.
