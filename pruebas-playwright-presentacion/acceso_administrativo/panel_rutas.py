import time

from common import run_admin_demo


def explorar_rutas(page):
    buscar = page.get_by_placeholder("Buscar por código, cliente o dirección...")
    if buscar.count():
        buscar.fill("demo presentación")
        time.sleep(2)
        buscar.fill("")


if __name__ == "__main__":
    run_admin_demo("Armado y Optimización de Rutas", "/rutas", explorar_rutas)
