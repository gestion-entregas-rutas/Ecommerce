import time

from common import run_store_demo


def buscar_y_filtrar(page):
    page.get_by_label("Buscar productos").fill("café")
    time.sleep(2)
    page.get_by_label("Buscar productos").fill("")
    category = page.locator("#f-cat")
    if category.locator("option").count() > 1:
        category.select_option(index=1)
        time.sleep(2)
        category.select_option(index=0)
    page.locator("#orden").select_option("precio_asc")
    time.sleep(2)
    page.locator("#orden").select_option("relevancia")


if __name__ == "__main__":
    run_store_demo("Catálogo y búsqueda", "/productos", buscar_y_filtrar)
