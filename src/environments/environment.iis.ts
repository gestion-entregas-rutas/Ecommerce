// Configuracion para la publicacion local en IIS (Jenkins: ng build --configuration production,iis).
// La API local corre en el sitio IIS delivery-api (puerto 5289).
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:5289/api',
  cartTokenStorageKey: 'tienda.cartToken.v1',
  cartStorageKey: 'tienda.cart.v1',
  sessionStorageKey: 'tienda.session.v1',
};
