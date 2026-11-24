import time

from common import run_admin_demo


def explorar_usuarios(page):
    buscar = page.get_by_placeholder("Buscar por usuario o repartidor...")
    if buscar.count():
        buscar.fill("demo")
        time.sleep(2)
        buscar.fill("")


if __name__ == "__main__":
    run_admin_demo("Cuentas y Acceso", "/usuarios", explorar_usuarios)
