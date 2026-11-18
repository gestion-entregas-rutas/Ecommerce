# Plan de Pruebas — Tienda E-Commerce Cliente (`front-tienda`)

**Proyecto:** Tienda E-Commerce Cliente (Angular 22, `http://localhost:4300`)  
**Backend/API:** `http://localhost:5289/api` (fuente de verdad: `CONTRATO_ECOMMERCE.md` y Swagger)  
**Alcance:** Flujo completo T1–T5 (catálogo → carrito → checkout/pago simulado → historial/seguimiento)  
**Fecha de plan:** 2026-11-14  
**Responsable:** [Definir]  
**Versión:** 1.0

> **Nota:** El formato PDF final debe seguir la plantilla institucional indicada. Este documento define el contenido, la estructura y la secuencia de ejecución para generar las evidencias en ese formato.

---

## 1. Análisis de requisitos (funcionalidades a probar)

| Módulo | Requisito/Funcionalidad | Endpoints / Componentes clave | Tipo |
|---|---|---|---|
| **T1. Autenticación y sesión** | Registro de cliente, login (usuario/correo), obtención de perfil, logout, persistencia de sesión, manejo de rol `Cliente`, expiración/sesión inválida con redirección conservando `returnUrl` | `POST /autenticacion/registro-cliente`, `POST /autenticacion/login`, `GET /autenticacion/me`, `POST /autenticacion/logout`; `/login`, `/registro`, interceptor auth/error, guard | Funcional, Seguridad |
| **T2. Catálogo y detalle** | Listado/búsqueda/filtrado/orden/paginación de productos, categorías/subcategorías, visualización de precios/ofertas/stock/rating/galería/ficha técnica, reseñas (solo cliente autenticado), visibilidad pública (no inactivos) | `GET /categorias`, `GET /categorias/{id}/subcategorias`, `GET /subcategorias`, `GET /productos`, `GET /productos/{id}`, `POST /productos/{id}/resenas`; `/`, `/productos`, `/producto/:id` | Funcional, UI/UX |
| **T3. Carrito** | Carrito invitado con `X-Cart-Token`, operaciones CRUD de ítems, persistencia local, merge al autenticarse, cotización/revalidación, advertencias y `requiereRevision` por stock/precio/disponibilidad | `GET /carrito`, `POST /carrito/items`, `PUT /carrito/items/{productoId}`, `DELETE /carrito/items/{productoId}`, `POST /carrito/merge`, `GET /carrito/cotizacion`; `/carrito` | Funcional, Integración |
| **T4. Checkout y pago simulado** | Flujo protegido por auth, modalidades `RetiroTienda`/`Domicilio`, validación de datos, mapa/cobertura (Leaflet + zonas), pago simulado, checkout con `Idempotency-Key`, confirmación/cancelación, expiración (`expiraEn`), manejo de conflictos y validaciones | `POST /ordenes/checkout`, `POST /ordenes/{id}/pago/confirmar`, `POST /ordenes/{id}/pago/cancelar`, `GET /zonas`; `/checkout` | Funcional, Integración, Concurrencia |
| **T5. Historial y seguimiento** | Listado de órdenes del cliente, estados de orden/pago/seguimiento, datos de retiro/domicilio, código de retiro, `pedidoLogisticoId`, refresco de estado | `GET /ordenes/mias`; `/mis-pedidos` | Funcional |
| **Transversales** | Manejo de errores `ProblemDetails`/códigos (`STOCK_AGOTADO`, `PAGO_NO_CONFIRMABLE`, `CONFLICTO_VERSION_PRODUCTO`), `401/409/422`, idempotencia ante doble clic/reintento, consistencia UI-API, mensajes claros, rendimiento percibido de búsqueda/carga | Interceptores HTTP, servicios, UI | No funcional (robustez, usabilidad, rendimiento) |

**Fuera de alcance (referencia):** administración de catálogo, armado de rutas/logística interna y algoritmos de ruteo en backend (solo se valida integración/seguimiento visible al cliente).

---

## 2. Diseño de pruebas (casos de prueba)

### 2.1 Convenciones
- **Prioridad:** Alta (A), Media (M), Baja (B)
- **Tipo:** F = Funcional, I = Integración, N = Negativa/Error, U = Usabilidad, R = Rendimiento/Robustez
- **Estado:** No ejecutado / Aprobado / Fallido / Bloqueado
- **Criterio global de aceptación:** el resultado real coincide con el esperado, sin errores bloqueantes, y los datos/estados en UI y API son consistentes.

### 2.2 Casos de prueba

| ID | Módulo | Caso de prueba | Precondiciones | Datos/Entradas | Pasos (acciones) | Resultado esperado | Criterio de aceptación | P | Tipo |
|---|---|---|---|---|---|---|---|---|---|
| CP-T1-01 | T1 | Registro de cliente exitoso | Backend activo, correo no registrado | Nombre, correo, teléfono, contraseña válidos | 1) Ir a `/registro` 2) Completar formulario 3) Enviar | Cuenta creada, sesión iniciada (token/usuario), merge de carrito si aplica, redirección a `returnUrl` o inicio | `201/200` en registro, sesión persistida, rol `Cliente` | A | F/I |
| CP-T1-02 | T1 | Login con usuario/correo válido | Usuario cliente existente | Usuario o correo + contraseña correctos | 1) Ir a `/login` 2) Ingresar credenciales 3) Enviar | Inicio de sesión correcto, perfil disponible, redirección a `returnUrl` (p.ej. `/checkout`) | Token válido, `GET /me` coherente, navegación correcta | A | F/I |
| CP-T1-03 | T1 | Login inválido | Backend activo | Credenciales incorrectas | Intentar login con datos erróneos | Mensaje de error claro, sin sesión creada | No se persiste token; UI informa fallo | A | N |
| CP-T1-04 | T1 | Sesión expirada/inválida | Token inválido/expirado | Acceder a ruta protegida o respuesta `401` | Navegar a `/checkout` o `/mis-pedidos` con sesión inválida | Limpieza de sesión y redirección a `/login?returnUrl=...` | Guarda intención de navegación; no queda estado inconsistente | A | F/N |
| CP-T1-05 | T1 | Logout | Sesión activa | Usuario autenticado | Ejecutar cerrar sesión | Sesión local limpiada, llamada a logout (si aplica), UI actualizada | No acceso a rutas protegidas sin reautenticación | M | F |
| CP-T2-01 | T2 | Listar catálogo con paginación | Productos activos en backend | - | 1) Abrir `/` o `/productos` | Se muestran productos (imagen, nombre, precio/oferta, stock, rating) y paginación según `PaginaDto` | Datos coherentes con `GET /productos` | A | F/I |
| CP-T2-02 | T2 | Búsqueda de productos | Productos existentes | Texto (nombre/marca) | 1) Ingresar término 2) Buscar/esperar auto-búsqueda | Resultados filtrados por término; URL refleja `buscar` | Resultados relevantes y consistentes con API | A | F/U |
| CP-T2-03 | T2 | Filtros y orden (aplicación inmediata) | Catálogo disponible | Categoría, rango de precio, solo ofertas, orden | Cambiar cada filtro/orden (un solo cambio) | Listado se actualiza sin pasos extra innecesarios; parámetros reflejados en URL | Menos clics: un cambio dispara actualización (precio con debounce aceptable) | A | F/U |
| CP-T2-04 | T2 | Detalle de producto | Producto con galería/ficha/reseñas | ID de producto | 1) Abrir `/producto/:id` | Muestra galería, precio/oferta, stock, ficha técnica, “sobre este artículo”, reseñas/calificación | Información completa y coherente con `GET /productos/{id}` | A | F |
| CP-T2-05 | T2 | Crear reseña autenticado | Cliente autenticado y elegible según backend | Calificación 1-5, comentario | 1) Enviar reseña en detalle | Reseña registrada o error de negocio mostrado correctamente | Manejo de éxito y errores (no comprado/duplicada/inválida) | M | F/N |
| CP-T2-06 | T2 | No mostrar productos inactivos al público | Existen productos inactivos | - | Navegar/buscar en catálogo público | Productos inactivos no aparecen | Cumple visibilidad pública | M | F |
| CP-T3-01 | T3 | Agregar ítem al carrito (invitado) | Catálogo con stock | Producto, cantidad válida | 1) Agregar desde catálogo/detalle | Ítem agregado, contador/subtotal actualizados, `X-Cart-Token` persistido | Estado UI = respuesta API/local | A | F/I |
| CP-T3-02 | T3 | Actualizar cantidad y eliminar ítem | Ítem en carrito | Nueva cantidad / eliminar | 1) Modificar cantidad 2) Quitar ítem | Totales y líneas recalculados correctamente | Operaciones reflejadas en `PUT/DELETE` y UI | A | F |
| CP-T3-03 | T3 | Cotización y requiere revisión | Carrito con cambios de precio/stock (simulado o real) | - | 1) Ir a carrito/checkout 2) Solicitar cotización | Muestra advertencias, totales y bandera `requiereRevision` cuando aplique | Bloqueo/ajuste de UI según revisión requerida | A | F/I |
| CP-T3-04 | T3 | Merge de carrito al login/registro | Carrito invitado con ítems; usuario cliente | Credenciales válidas | 1) Tener carrito invitado 2) Iniciar sesión/registrarse | Se invoca merge, carrito resultante reemplaza estado local (suma/acotado a stock según backend) | Ítems conservados según reglas de backend | A | F/I |
| CP-T3-05 | T3 | Proceder al pago sin autenticación | Carrito con ítems, usuario no autenticado | - | 1) Clic en “Proceder al pago” | Redirige a `/login?returnUrl=/checkout` sin perder carrito | Carrito intacto tras autenticación | A | F |
| CP-T4-01 | T4 | Checkout retiro en tienda (éxito) | Cliente autenticado, carrito válido | Datos retiro (cédula, nombre, tel., fecha, franja), pago simulado | 1) Ir a `/checkout` 2) Elegir `RetiroTienda` 3) Completar datos y pagar | Orden creada (`201`), muestra número, estado, total, expiración/código retiro según respuesta | UI consistente con respuesta; idempotencia en envío | A | F/I |
| CP-T4-02 | T4 | Checkout domicilio con cobertura válida | Cliente autenticado, zonas activas disponibles | Dirección, fecha/hora, punto dentro de cobertura, pago simulado | 1) Elegir `Domicilio` 2) Marcar punto en mapa 3) Pagar | Cobertura local válida, checkout exitoso, estados/seguimiento mostrados | Validación UI + aceptación backend; orden creada | A | F/I |
| CP-T4-03 | T4 | Domicilio sin cobertura (422 / validación) | Punto fuera de polígono o backend rechaza | Ubicación fuera de zona | Intentar pagar/enviar con ubicación no cubierta | Bloqueo/mensaje claro solicitando otra ubicación; no se confirma orden inválida | Manejo correcto de `422` o validación previa | A | N |
| CP-T4-04 | T4 | Conflicto por stock agotado (409 STOCK_AGOTADO) | Stock insuficiente durante checkout | Ítems que exceden disponibilidad | Ejecutar checkout | Mensaje indicando producto/stock disponible, refresco de carrito/cotización, sin duplicar orden | UI permite corregir y reintentar | A | N/I |
| CP-T4-05 | T4 | Pago no confirmable / reserva expirada (409 PAGO_NO_CONFIRMABLE) | Orden pendiente expirada o reserva liberada | Confirmar pago fuera de vigencia | Intentar confirmar | Mensaje claro indicando expiración/liberación y guía a nuevo checkout | No se marca pagada; usuario puede reintentar flujo | A | N |
| CP-T4-06 | T4 | Idempotencia en checkout/confirmación | Cliente autenticado, carrito válido | Mismo intento (doble clic/reintento controlado) | Reintentar envío con misma intención/clave según implementación | No se duplican órdenes ni cobros; respuesta consistente | Una sola orden efectiva por intento | A | R/I |
| CP-T4-07 | T4 | Expiración en UI (`expiraEn`) | Checkout retorna `expiraEn` | - | Observar temporizador/estado | UI muestra vencimiento y estado correspondiente | Información clara para confirmar/cancelar/reintentar | M | F/U |
| CP-T4-08 | T4 | Validaciones de formulario de entrega/pago | - | Campos vacíos o formato inválido (tarjeta, fecha/hora, etc.) | Intentar continuar con datos inválidos | Validaciones visuales/mensajes; no envío inválido evitable en cliente | Prevención de errores de captura | M | N/U |
| CP-T5-01 | T5 | Listado de mis pedidos | Cliente con órdenes previas | Sesión cliente | 1) Ir a `/mis-pedidos` | Se listan órdenes con estado orden/pago, total, tipo entrega, códigos/seguimiento según aplique | Datos coherentes con `GET /ordenes/mias` | A | F/I |
| CP-T5-02 | T5 | Seguimiento/actualización de estado | Orden con cambios de estado | - | 1) Abrir pedidos 2) Refrescar/esperar polling (si aplica) | Estados de seguimiento actualizados (`Pendiente/Asignado/EnCamino/Entregado` o retiro) | Refleja estado actual disponible en API | M | F |
| CP-TR-01 | Transversal | Carga y consulta de productos (rendimiento percibido) | Backend y red operativos | Búsqueda/filtros frecuentes | Navegar a catálogo, filtrar, buscar, paginar | Respuesta en tiempo aceptable; sin esperas indefinidas; manejo de timeout/reintento y cancelación de consultas obsoletas | Cumple umbral definido por el equipo (p.ej. < X s) y UI no se bloquea | M | R/U |
| CP-TR-02 | Transversal | Mensajes y recuperación ante errores | Escenarios CP-T4-03/04/05 y fallos de red | - | Provocar errores controlados | Mensajes claros y acciones de recuperación (actualizar cotización, cambiar dirección, nuevo checkout) | Usuario puede continuar el flujo | A | N/U |

---

## 3. Preparación del entorno

| Ítem | Detalle | Responsable | Estado |
|---|---|---|---|
| **Frontend** | `front-tienda` instalado (`npm install`), ejecutándose en `http://localhost:4300` (`npm start`/`ng serve --port 4300`) | [ ] | Pendiente |
| **Backend/API** | Servicio disponible en `http://localhost:5289/api`, con Swagger accesible y base de datos preparada | [ ] | Pendiente |
| **Datos de prueba** | Categorías sembradas, productos activos/inactivos, productos con stock suficiente/bajo/cero, ofertas, usuarios `Cliente` (y al menos uno de prueba), zonas de cobertura activas/inactivas, órdenes históricas (opcional) | [ ] | Pendiente |
| **Cuentas** | Credenciales de cliente de prueba (válidas e inválidas) y, si se requiere, apoyo de admin para preparar stock/zonas | [ ] | Pendiente |
| **Herramientas** | Navegador (Chrome/Edge), DevTools (Network/Console/Application), herramienta API (Postman/Swagger) para verificar respuestas, capturador de pantalla/video, reloj para tiempos | [ ] | Pendiente |
| **Configuración** | Verificar `environment` (URL API), limpiar `localStorage`/cookies cuando se requiera estado limpio (`session`, `cartToken`, carrito), hora/zona del equipo correcta | [ ] | Pendiente |
| **Criterios de entrada** | Ambiente estable, datos cargados, build sin errores (`npm run build`), casos diseñados y revisados | [ ] | Pendiente |
| **Criterios de salida** | Casos críticos ejecutados, defectos registrados, evidencias recopiladas, informe de resultados generado | [ ] | Pendiente |

---

## 4. Ejecución de pruebas

### 4.1 Estrategia y orden de ejecución
1. **Humo (Smoke):** CP-T1-02, CP-T2-01, CP-T3-01, CP-T4-01, CP-T5-01 (verificar disponibilidad del flujo principal).
2. **Funcionales por módulo:** T1 → T2 → T3 → T4 → T5.
3. **Negativas y robustez:** errores `401/409/422`, expiración, idempotencia, cobertura, datos inválidos.
4. **Usabilidad y rendimiento percibido:** búsqueda/filtros, mensajes, tiempos de respuesta y comportamiento ante demoras/timeouts.
5. **Regresión:** re-ejecución de casos críticos tras correcciones.

### 4.2 Registro de ejecución (por caso)
Para cada caso documentar: **ID, fecha/hora, ejecutor, build/versión, datos usados, resultado esperado, resultado real, estado (Aprobado/Fallido/Bloqueado), evidencia (captura/video/log) y observaciones**.

### 4.3 Matriz sugerida de ciclos
| Ciclo | Objetivo | Casos | Criterio de paso |
|---|---|---|---|
| Ciclo 1 - Smoke | Validar entorno y flujo básico | Críticos de T1–T5 | 100% aprobados para continuar |
| Ciclo 2 - Funcional | Cobertura de requisitos | Todos los F/I | ≥ 95% aprobados, sin defectos críticos abiertos |
| Ciclo 3 - Negativo/Robustez | Concurrencia, errores y recuperación | N/R | Defectos críticos/altos controlados |
| Ciclo 4 - Regresión | Confirmar correcciones | Casos afectados + críticos | Sin re-aperturas en críticos |

---

## 5. Registro de incidentes (reporte de defectos)

Usar el siguiente formato para cada hallazgo:

| Campo | Descripción |
|---|---|
| **ID defecto** | DEF-TIENDA-001 |
| **Título** | Resumen claro del problema |
| **Módulo/Caso** | T4 / CP-T4-04 |
| **Severidad** | Crítica / Alta / Media / Baja |
| **Prioridad** | Alta / Media / Baja |
| **Entorno** | Navegador, OS, versión front, URL API, fecha/hora |
| **Precondiciones** | Estado inicial y datos |
| **Pasos para reproducir** | 1... 2... 3... |
| **Resultado esperado** | Según caso/contrato |
| **Resultado real** | Comportamiento observado |
| **Evidencia** | Capturas, video, request/response (Network), consola, payload |
| **Código/error API** | HTTP status, `codigo`, `mensaje`, `traceId` (si aplica) |
| **Estado** | Nuevo / En análisis / Asignado / Corregido / Reabierto / Cerrado |

**Clasificación sugerida de severidad:**
- **Crítica:** impide compra/pago/login o genera duplicidad de órdenes/cobros.
- **Alta:** funcionalidad principal falla sin alternativa (stock, merge, confirmación, seguimiento).
- **Media:** falla parcial con alternativa o error de validación/mensaje importante.
- **Baja:** defecto cosmético o de texto sin impacto funcional.

---

## 6. Verificación de resultados

1. **Comparación esperado vs real:** marcar cada caso como Aprobado/Fallido/Bloqueado con evidencia.
2. **Consistencia UI-API:** validar en Network/Swagger que códigos HTTP, cuerpos (`ProblemDetails`, `PaginaDto`, estados, `expiraEn`, `codigoRetiro`, `estadoSeguimiento`) correspondan a lo mostrado.
3. **Reglas críticas:**
   - `409 STOCK_AGOTADO`: informa producto/stock y permite recuperar carrito/cotización.
   - `422` cobertura: impide envío inválido y solicita nueva ubicación.
   - `409 PAGO_NO_CONFIRMABLE`: indica expiración/liberación y guía a nuevo checkout.
   - **Idempotencia:** sin órdenes/cobros duplicados ante reintentos/doble clic.
   - **401:** redirección a login conservando intención.
4. **Métricas de cierre:** % ejecutado, % aprobado, defectos por severidad, casos bloqueados y riesgos abiertos.
5. **Conclusión:** el sistema **cumple / cumple con observaciones / no cumple** los criterios de aceptación definidos, según resultados y defectos pendientes.

---

## 7. Entrega de evidencias (documento PDF)

### 7.1 Estructura propuesta del PDF
1. **Portada:** proyecto, módulo, versión, fecha, autor, revisores.
2. **Índice.**
3. **Objetivo y alcance.**
4. **Análisis de requisitos** (tabla sección 1).
5. **Diseño de casos de prueba** (tabla sección 2 + trazabilidad requisito → caso).
6. **Preparación del entorno** (checklist, datos, herramientas, versiones/build).
7. **Ejecución y resultados** (matriz de ejecución, resumen por ciclo/módulo).
8. **Registro de incidentes** (detalle de defectos y estado).
9. **Verificación y conclusión** (comparativo, métricas, aceptación, riesgos/recomendaciones).
10. **Anexos/Evidencias:** capturas, enlaces/exports de logs, respuestas API relevantes, hash/fecha de build.

### 7.2 Trazabilidad mínima (ejemplo)
| Requisito | Casos asociados |
|---|---|
| T1 Autenticación y sesión | CP-T1-01 a CP-T1-05 |
| T2 Catálogo y detalle | CP-T2-01 a CP-T2-06 |
| T3 Carrito, merge y cotización | CP-T3-01 a CP-T3-05 |
| T4 Checkout/pago/concurrencia | CP-T4-01 a CP-T4-08 |
| T5 Historial y seguimiento | CP-T5-01 a CP-T5-02 |
| Transversales | CP-TR-01, CP-TR-02 |

### 7.3 Plan de trabajo para generar el entregable
| Fase | Actividad | Salida | Duración estimada |
|---|---|---|---|
| 1 | Revisar `CONTRATO_ECOMMERCE.md`, `AGENTS.md` y alcance implementado; ajustar casos | Matriz de pruebas final | 0.5–1 día |
| 2 | Preparar ambiente, datos y cuentas de prueba | Checklist de entorno listo | 0.5 día |
| 3 | Ejecutar smoke y ciclos funcionales/negativos | Matriz de ejecución + evidencias | 1–2 días |
| 4 | Registrar defectos y apoyar verificación de fixes | Reporte de incidentes actualizado | Continuo |
| 5 | Re-ejecutar regresión y consolidar resultados | Métricas y conclusión | 0.5 día |
| 6 | Maquetar y exportar el informe al **formato PDF indicado** con anexos | **Documento PDF final** | 0.5 día |

**Criterio de entrega:** PDF completo, con casos ejecutados, evidencias adjuntas/referenciadas, defectos documentados y conclusión de aceptación firmable por el responsable. Si existe una plantilla institucional específica, mapear cada sección anterior a los campos requeridos por dicha plantilla antes de la exportación final.
