import time

from common import run_admin_demo


def explorar_repartidores(page):
    buscar = page.get_by_placeholder("Buscar por nombre o teléfono...")
    if buscar.count():
        buscar.fill("demo")
        time.sleep(2)
        buscar.fill("")


if __name__ == "__main__":
    run_admin_demo("Repartidores y Flota", "/repartidores", explorar_repartidores)
