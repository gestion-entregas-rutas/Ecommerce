import time

from common import STORE_URL, run_store_demo


def agregar_productos_y_revisar_carrito(page):
    time.sleep(3)
    tarjetas = page.locator("article")
    agregados = 0
    for indice in range(tarjetas.count()):
        boton = tarjetas.nth(indice).get_by_role("button", name="Agregar al carrito")
        if not boton.count() or not boton.is_enabled():
            continue
        boton.click()
        agregados += 1
        time.sleep(2)
        if agregados == 2:
            break
    if agregados == 0:
        print("No se encontraron productos disponibles para agregar. Revisa el catálogo y la API.")
        return
    page.goto(f"{STORE_URL}/carrito", wait_until="domcontentloaded", timeout=20000)
    time.sleep(3)
    vacio = page.get_by_text("Tu carrito está vacío")
    if vacio.count():
        print("El carrito aparece vacío; revisa la solicitud para agregar productos en DevTools.")
    else:
        print(f"Se agregaron {agregados} producto(s). El carrito está listo para presentar.")


if __name__ == "__main__":
    run_store_demo("Carrito con productos", "/productos", agregar_productos_y_revisar_carrito)
