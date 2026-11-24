import time

from common import run_store_demo


def abrir_producto(page):
    producto = page.locator('a[aria-label^="Ver "]').first
    if producto.count() == 0:
        print("No hay productos disponibles para abrir el detalle.")
        return
    producto.click()
    time.sleep(2)
    print("Producto abierto:", page.locator("h1").first.inner_text())


if __name__ == "__main__":
    run_store_demo("Detalle de producto", "/productos", abrir_producto)
