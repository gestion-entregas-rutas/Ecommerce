import time

from common import run_admin_demo


def explorar_catalogo(page):
    buscar = page.locator('input[placeholder*="Buscar por nombre"]').first
    if buscar.count():
        buscar.fill("demo")
        time.sleep(2)
        buscar.fill("")
    filtro = page.get_by_label("Filtrar por categoría")
    if filtro.count():
        filtro.select_option(index=0)


if __name__ == "__main__":
    run_admin_demo("Catálogo y Productos", "/productos", explorar_catalogo)
