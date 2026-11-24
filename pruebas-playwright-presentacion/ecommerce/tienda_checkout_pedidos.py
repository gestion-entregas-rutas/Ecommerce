import time

from common import run_store_demo


def revisar_rutas_protegidas(page):
    for route in ("/checkout", "/mis-pedidos", "/mi-cuenta"):
        page.goto(f"http://localhost:5330{route}")
        time.sleep(2)
        print(route, "→", page.url)


if __name__ == "__main__":
    run_store_demo("Checkout, pedidos y cuenta", "/checkout", revisar_rutas_protegidas)
