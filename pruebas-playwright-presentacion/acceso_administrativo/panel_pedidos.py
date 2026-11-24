import time

from common import run_admin_demo


def explorar_filtro(page):
    buscar = page.locator('input[placeholder*="Buscar"]').first
    if buscar.count():
        buscar.fill("demo presentación")
        time.sleep(2)
        buscar.fill("")


if __name__ == "__main__":
    run_admin_demo("Pedidos", "/pedidos", explorar_filtro)
