import time

from common import run_admin_demo


def explorar_retiros(page):
    buscar = page.locator('input[placeholder*="Buscar cédula"]')
    if buscar.count():
        buscar.fill("demo")
        time.sleep(2)
        buscar.fill("")


if __name__ == "__main__":
    run_admin_demo("Retiros en Tienda", "/retiros-tienda", explorar_retiros)
