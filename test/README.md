# Estructura y Ejecución de Pruebas — E-Commerce (`front-tienda`)

Este directorio contiene la suite completa de pruebas del repositorio de E-commerce, estructurada según las especificaciones del plan de pruebas (`Repositorio-Ecommerce.md`) y separada rigurosamente en pruebas unitarias y pruebas de integración.

---

## 📁 Organización de Carpetas

```text
Ecommerce/test/
├── unitarias/                        # Pruebas Unitarias (Angular TestBed + Vitest)
│   ├── app.spec.ts                  # Componente principal (Header, navegación, marcas)
│   ├── auth.service.spec.ts         # Servicio de autenticación (Login, Registro, Me, Logout, Sesión)
│   ├── auth.guard.spec.ts           # Guard de protección de rutas (/checkout, /mis-pedidos)
│   ├── auth.interceptor.spec.ts     # Interceptor HTTP para inyección de Authorization y X-Cart-Token
│   ├── error.interceptor.spec.ts    # Manejo de ProblemDetails, enriquecimiento de errores y 401
│   ├── cart.service.spec.ts         # Servicio del carrito (CRUD de ítems, cotización, merge, signals)
│   ├── cart-token.service.spec.ts   # Persistencia y gestión del token de carrito de invitado
│   ├── catalog.service.spec.ts      # Servicio de catálogo (Categorías, productos, filtros, reseñas, zonas)
│   ├── order.service.spec.ts        # Servicio de órdenes (Checkout, confirmación, cancelación, historial)
│   ├── storage.service.spec.ts      # Servicio de almacenamiento local seguro y tipado
│   ├── catalog.page.spec.ts         # Página de catálogo (Filtros, debounce, orden, paginación, reintento)
│   ├── product-detail.page.spec.ts  # Página de detalle (Galería, ficha técnica, stock, reseñas)
│   ├── cart.page.spec.ts            # Página de carrito (Listado, cantidades, resumen, navegación segura)
│   ├── checkout.page.spec.ts        # Página de checkout (Retiro en tienda, domicilio, pago simulado)
│   ├── login.page.spec.ts           # Página de login (Validaciones, submit, returnUrl)
│   ├── registro.page.spec.ts        # Página de registro (Formulario, creación de cliente, sesión)
│   └── orders.page.spec.ts          # Página de pedidos (Listado, progreso de seguimiento y estados)
│
└── integracion/                      # Pruebas de Integración (Playwright - API & Browser E2E)
    ├── test-helpers.ts              # Utilidades compartidas (Endpoints, payloads, generador de datos)
    ├── t1-autenticacion.spec.ts     # CP-T1-01 a CP-T1-05 (Registro, Login, Perfil, Inválido, Sesión, Logout)
    ├── t2-catalogo.spec.ts          # CP-T2-01 a CP-T2-06 (Listado, Búsqueda, Filtros, Detalle, Reseñas, Inactivos)
    ├── t3-carrito.spec.ts           # CP-T3-01 a CP-T3-05 (CRUD invitado, Cotización, Merge, Retención en login)
    ├── t4-checkout.spec.ts          # CP-T4-01 a CP-T4-08 (Retiro, Domicilio, Cobertura, Concurrencia, Idempotencia)
    ├── t5-pedidos.spec.ts           # CP-T5-01 a CP-T5-02 (Historial autenticado, Consulta protegida)
    └── transversales.spec.ts        # CP-TR-01 y CP-TR-02 (Rendimiento percibido < 15s, Recuperación ante error)
```

---

## 🧪 1. Pruebas Unitarias (`test/unitarias/`)

Las pruebas unitarias aíslan y verifican la lógica individual de componentes, servicios, interceptores y guards de Angular utilizando el `TestBed`, `HttpTestingController` y `Vitest`.

### Cobertura implementada:
- **Servicios Principales:** `AuthService`, `CartService`, `CatalogService`, `OrderService`, `CartTokenService`, `StorageService`.
- **Seguridad e Interceptores:** `authGuard`, `authInterceptor`, `errorInterceptor`.
- **Componentes y Vistas:** `App`, `CatalogPage`, `ProductDetailPage`, `CartPage`, `CheckoutPage`, `LoginPage`, `RegistroPage`, `OrdersPage`.

### Comando para ejecutar las pruebas unitarias:
```bash
npm run test:unitarias
# o directamente:
ng test --watch=false
```

---

## 🔗 2. Pruebas de Integración (`test/integracion/`)

Las pruebas de integración ejecutan los 28 casos formales especificados en el documento base `Repositorio-Ecommerce.md`:

| Módulo | Archivo de Prueba | Casos Cubiertos | Descripción |
|---|---|---|---|
| **T1. Autenticación y sesión** | `t1-autenticacion.spec.ts` | CP-T1-01 a CP-T1-05 | Registro exitoso, login y perfil, login inválido, expiración con `returnUrl`, logout e invalidación de sesión. |
| **T2. Catálogo y detalle** | `t2-catalogo.spec.ts` | CP-T2-01 a CP-T2-06 | Paginación y estructura `PaginaDto`, búsqueda de productos, filtros y orden inmediato, detalle y ficha técnica, validación de reseñas y no visibilidad de inactivos. |
| **T3. Carrito y cotización** | `t3-carrito.spec.ts` | CP-T3-01 a CP-T3-05 | Alta y token de invitado `X-Cart-Token`, actualización y borrado de ítems, cotización, merge post-login y retención de carrito al pasar al pago. |
| **T4. Checkout y pago** | `t4-checkout.spec.ts` | CP-T4-01 a CP-T4-08 | Retiro en tienda, envío a domicilio, validación de zonas de cobertura, manejo de stock agotado (409), pago expirado, idempotencia (`Idempotency-Key`), temporizador `expiraEn` y validaciones de formulario. |
| **T5. Historial y pedidos** | `t5-pedidos.spec.ts` | CP-T5-01 a CP-T5-02 | Acceso autenticado a mis pedidos y protección contra consultas anónimas. |
| **Transversales** | `transversales.spec.ts` | CP-TR-01 y CP-TR-02 | Carga percibida del catálogo (< 15 s) y mecanismo de recuperación con botón "Reintentar" ante fallos de red. |

### Comandos para ejecutar las pruebas de integración:
```bash
# Listar todos los 28 casos
npm run test:integracion -- --list

# Ejecutar la suite completa de integración
npm run test:integracion

# Ejecutar un módulo específico (ejemplo T1)
npx playwright test test/integracion/t1-autenticacion.spec.ts
```

---

## ⚙️ Configuración y Variables de Entorno

- **URL de la API:** `ECOMMERCE_API_URL` (por defecto `http://127.0.0.1:5289/api`)
- **URL del Frontend:** `ECOMMERCE_UI_URL` (por defecto `http://127.0.0.1:4300`)
- **Reportes de Integración:** Generados automáticamente en `Ecommerce/playwright-report/` y `Ecommerce/test-results/`.
