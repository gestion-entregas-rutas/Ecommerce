import time

from common import STORE_URL, run_store_demo


def revisar_rutas_protegidas(page):
    for route in ("/checkout", "/mis-pedidos", "/mi-cuenta"):
        page.goto(f"{STORE_URL}{route}", wait_until="domcontentloaded", timeout=20000)
        time.sleep(2)
        print(route, "→", page.url)


if __name__ == "__main__":
    run_store_demo("Checkout, pedidos y cuenta", "/checkout", revisar_rutas_protegidas)
