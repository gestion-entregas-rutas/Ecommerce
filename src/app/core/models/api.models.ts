export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  codigo?: string;
  mensaje?: string;
  [key: string]: unknown;
}

export interface PaginaDto<T> {
  items: T[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}

export type RolUsuario = 'Administrador' | 'Repartidor' | 'Cliente' | string;

export interface UsuarioSesion {
  id: string;
  nombreCompleto: string;
  correo: string;
  telefono?: string | null;
  rol: RolUsuario;
}

export interface AuthResponse {
  /** Current backend contract uses accessToken; token remains for older deployments. */
  accessToken?: string;
  token?: string;
  usuario: UsuarioSesion;
  expiraEn?: string;
}

export interface Categoria {
  id: string;
  numero?: number;
  nombre: string;
  cantidadProductos?: number;
  activa?: boolean;
}

export interface Subcategoria {
  id: string;
  nombre: string;
  categoriaId?: string;
}

export interface MediaItem {
  tipo: 'imagen' | 'video' | string;
  url: string;
  orden?: number;
}

export interface FichaTecnicaItem {
  clave: string;
  valor: string;
}

export interface ResenaProducto {
  id?: string;
  clienteNombre?: string;
  calificacion: number;
  comentario?: string;
  fechaCreacion?: string;
}

export interface Producto {
  id: string;
  categoriaId?: string;
  categoriaNombre?: string;
  subcategoria?: string;
  subcategoriaId?: string;
  nombre: string;
  marca?: string;
  descripcionCorta?: string;
  precioBase: number;
  precioOferta?: number | null;
  stock: number;
  activo?: boolean;
  imagenPrincipalUrl?: string | null;
  galeriaMultimedia?: MediaItem[];
  fichaTecnica?: FichaTecnicaItem[];
  sobreEsteArticulo?: string[];
  calificacionPromedio?: number;
  totalResenas?: number;
  version?: string;
  resenas?: ResenaProducto[];
}

export interface ProductoListParams {
  categoriaId?: string | null;
  subcategoriaId?: string | null;
  buscar?: string | null;
  soloOfertas?: boolean;
  precioMin?: number | null;
  precioMax?: number | null;
  orden?: 'relevancia' | 'precio_asc' | 'precio_desc' | 'calificacion' | string;
  pagina?: number;
  tamanoPagina?: number;
}

export interface CarritoItem {
  productoId: string;
  nombre?: string;
  imagenUrl?: string | null;
  imagenPrincipalUrl?: string | null;
  precioUnitario?: number;
  precioAplicado?: number;
  activo?: boolean;
  advertencia?: string | null;
  precioBase?: number;
  precioOferta?: number | null;
  cantidad: number;
  subtotal?: number;
  stockDisponible?: number;
  disponible?: boolean;
  mensaje?: string;
}

export interface Carrito {
  items: CarritoItem[];
  subtotal?: number;
  total?: number;
  cantidadTotal?: number;
  cartToken?: string;
  tokenInvitado?: string | null;
  descuento?: number;
  envio?: number;
  requiereRevision?: boolean;
  advertencias?: string[];
}

export type TipoEntrega = 'RetiroTienda' | 'Domicilio';

export interface DatosRetiroTienda {
  cedulaQuienRetira: string;
  nombreQuienRetira: string;
  telefonoContacto: string;
  fechaRetiro: string;
  franjaHoraria: string;
}

export interface DatosDomicilio {
  destinatarioNombre: string;
  destinatarioTelefono: string;
  direccionTexto: string;
  latitud: number;
  longitud: number;
  fechaEntrega: string;
  horaEntrega: string;
  observaciones?: string | null;
}

export interface MetodoPagoSimulado {
  tipo: 'Tarjeta' | 'Transferencia' | 'PayPal' | string;
  titular?: string | null;
  ultimos4?: string | null;
  referenciaSimulada?: string | null;
}

export interface PayPalOrdenResponse {
  ordenId: string;
  payPalOrderId: string;
  urlAprobacion: string;
  estadoPago: string;
}

export interface CheckoutRequest {
  items: { productoId: string; cantidad: number }[];
  tipoEntrega: TipoEntrega;
  datosRetiroTienda?: DatosRetiroTienda | null;
  datosDomicilio?: DatosDomicilio | null;
  metodoPago: MetodoPagoSimulado;
}

export interface CheckoutResponse {
  ordenId: string;
  numeroOrden?: string;
  estadoOrden?: string;
  estadoPago?: string;
  totalPagado?: number;
  total?: number;
  tipoEntrega: TipoEntrega;
  codigoRetiro?: string | null;
  pedidoLogisticoId?: string | null;
  estadoSeguimiento?: string | null;
  referenciaPago?: string;
  expiraEn?: string;
}

export interface DetalleOrdenMia {
  productoId: string;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface OrdenDetalleMia {
  ordenId: string;
  numeroOrden: string;
  estadoOrden: string;
  estadoPago: string;
  total: number;
  tipoEntrega: TipoEntrega;
  creadaEn: string;
  codigoRetiro: string | null;
  fechaRetiro: string | null;
  franjaHoraria: string | null;
  direccionEntrega: string | null;
  fechaEntrega: string | null;
  horaEntrega: string | null;
  items: DetalleOrdenMia[];
}

export interface OrdenItemSnapshot {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
  imagenUrl?: string | null;
}

export interface OrdenResumen {
  ordenId: string;
  numeroOrden?: string;
  estadoOrden?: string;
  estadoPago?: string;
  total?: number;
  tipoEntrega?: TipoEntrega;
  codigoRetiro?: string | null;
  pedidoLogisticoId?: string | null;
  estadoSeguimiento?: string | null;
  fechaCreacion?: string;
  creadaEn?: string;
  expiraEn?: string;
  items?: CarritoItem[];
}

export interface Zona {
  id: string | number;
  nombre?: string;
  activa?: boolean;
  poligono?: { latitud: number; longitud: number }[];
  coordenadas?: { latitud: number; longitud: number }[];
}
