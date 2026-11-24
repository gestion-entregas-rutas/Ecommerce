import os
import subprocess
import sys
from getpass import getpass


modules = [
    "ecommerce.tienda_catalogo",
    "ecommerce.tienda_ofertas",
    "ecommerce.tienda_producto",
    "ecommerce.tienda_login",
    "ecommerce.tienda_carrito",
    "ecommerce.tienda_cuenta",
    "ecommerce.tienda_checkout_pedidos",
    "acceso_administrativo.panel_login",
    "acceso_administrativo.panel_centro_control",
    "acceso_administrativo.panel_pedidos",
    "acceso_administrativo.panel_productos",
    "acceso_administrativo.panel_rutas",
    "acceso_administrativo.panel_zonas",
    "acceso_administrativo.panel_repartidores",
    "acceso_administrativo.panel_retiros",
    "acceso_administrativo.panel_usuarios",
    "acceso_administrativo.panel_credenciales",
]

folder = os.path.dirname(os.path.abspath(__file__))
if not os.environ.get("PRESENTACION_ADMIN_USUARIO"):
    os.environ["PRESENTACION_ADMIN_USUARIO"] = input("Usuario administrador: ")
if not os.environ.get("PRESENTACION_ADMIN_CLAVE"):
    os.environ["PRESENTACION_ADMIN_CLAVE"] = getpass("Contraseña administrador: ")

for module in modules:
    print(f"\n>>> Ejecutando {module}", flush=True)
    subprocess.run([sys.executable, "-m", module], check=True, cwd=folder)
