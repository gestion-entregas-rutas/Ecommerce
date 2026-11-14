# AGENTS.md — Tienda E-Commerce Cliente (`frontend-tienda`)

## 1. Contexto y Misión
Este repositorio es una aplicación nueva en **Angular 22** (puerto de desarrollo `4300`, conectada al backend en `http://localhost:5289/api`) que implementa la experiencia de compra en línea estilo **Amazon** para los clientes finales, siguiendo estrictamente el contrato definido en `CONTRATO_ECOMMERCE.md`.

## 2. Stack Tecnológico y Arquitectura
- **Angular 22** con componentes `standalone`, Signals para estado reactivo (`CartService`, `AuthCustomerService`, `CatalogService`) y lazy loading en `app.routes.ts`.
- **Tailwind CSS 4** para diseño limpio, moderno y responsivo.
- **Leaflet 1.9** con teselas OpenStreetMap (uso exclusivo de visualización de mapa para que el cliente marque su punto de entrega a domicilio; toda lógica de cobertura y ruteo la resuelve nuestro backend).
- **Sin SSR (`ssr: false`)** para garantizar persistencia directa del carrito de invitado en `localStorage`.
- Configurar `angular.json` para que `npm start` levante por defecto en el puerto **`4300`** (`--port 4300`).

## 3. Flujo Funcional Obligatorio (Estilo Amazon)
1. **Header y Barra de Departamentos:**
   - Buscador central con selector desplegable de los **28 departamentos** oficiales (`Todos los departamentos`, `Arte y artesanías`, `Automotriz`, ..., `Videojuegos`).
   - Barra secundaria de acceso rápido a departamentos destacados y "Ofertas".
   - Indicador de carrito en tiempo real (contador de ítems) y botón de Cuenta ("Hola, Identifícate" o nombre del cliente).
2. **Catálogo y Filtros (`/` y `/productos`):**
   - Grid de tarjetas de producto con imagen principal, título, calificación en estrellas, precio actual, precio tachado (si hay oferta) y disponibilidad de stock.
   - Filtros laterales por categoría, rango de precio, solo ofertas y ordenamiento (`relevancia`, `precio_asc`, `precio_desc`, `calificacion`).
3. **Vista de Detalle de Producto (`/producto/:id`):**
   - Columna izquierda: Galería multimedia interactiva (imagen principal + miniaturas de fotos/videos).
   - Columna central: Marca, título, calificación promedio, precio/oferta, tabla limpia de **Ficha Técnica** (Marca, Dimensiones, Peso, Material, etc.) y lista de viñetas **"Sobre este artículo"**.
   - Columna derecha (Buy Box): Precio, estado de stock ("Disponible" / "Agotado"), selector de cantidad (limitado al stock disponible), botón **"Agregar al carrito"** y **"Comprar ahora"**.
   - Sección inferior: Reseñas de clientes y formulario para publicar reseña (si el cliente está autenticado).
4. **Carrito de Compras (`/carrito`) — Modo Invitado:**
   - Funciona sin iniciar sesión (`localStorage` clave `tienda.cart.v1`).
   - Permite modificar cantidades, eliminar ítems y ver subtotal.
   - **Regla de Login:** Al pulsar **"Proceder al pago"**, si el usuario no está autenticado como `Cliente`, redirigir a `/login?returnUrl=/checkout`. Tras iniciar sesión o registrarse (`/registro`), el carrito se conserva intacto y continúa automáticamente al checkout.
5. **Checkout y Pago (`/checkout`) — Protegido por AuthGuard:**
   - **Paso 1 — Modalidad de Entrega (Selector claro):**
     - **Opción A: Recoger en Tienda (`RetiroTienda`):** Formulario solicitando Cédula de quien retira, Nombre completo, Teléfono, Fecha de retiro y Franja horaria.
     - **Opción B: Entrega a Domicilio (`Domicilio`):** Formulario con Destinatario, Teléfono, Fecha y hora deseada, Observaciones y **Mapa Interactivo Leaflet** para marcar la ubicación exacta (cargando los polígonos de zonas activas desde `GET /api/zonas` para mostrar visualmente el área de cobertura y validar localmente con Ray Casting antes de enviar). Si el punto está fuera de cobertura, bloquear el pago y mostrar alerta clara.
   - **Paso 2 — Método de Pago:** Formulario de pago con tarjeta (validación visual de formato de tarjeta, fecha y CVV) o transferencia simulada.
   - **Paso 3 — Confirmación y Manejo de Concurrencia:**
     - Enviar `POST /api/ordenes/checkout` con token Bearer del cliente.
     - Si el backend responde `HTTP 409 Conflict` (`STOCK_AGOTADO`), mostrar alerta clara indicando qué producto se agotó o redujo su stock, actualizar el carrito y permitir continuar sin perder el resto de la compra.
     - Si responde `201 Created`, limpiar el carrito y mostrar pantalla de recibo con número de orden (`ORD-...`), código de retiro (si es en tienda) o estado de seguimiento (si es domicilio).
6. **Mis Pedidos (`/mis-pedidos`):**
   - Consulta `GET /api/ordenes/mias` mostrando historial de compras, detalle de artículos y estado en tiempo real (mostrando si el pedido a domicilio está `Pendiente`, `Asignado`, `EnCamino` o `Entregado`).

## 4. Calidad y Pruebas
- Configurar pruebas unitarias con **Vitest** / Jasmine cubriendo `CartService` (persistencia invitado, límites de stock) y manejo de errores `409` en el flujo de checkout.
- Ejecutar `npm run build` y `npm test -- --watch=false` verificando 0 errores antes de cerrar tareas.