import time

from common import STORE_URL, run_store_demo


def revisar_acceso(page):
    page.locator('input[name="usuarioOCorreo"]').wait_for()
    time.sleep(2)
    page.goto(f"{STORE_URL}/registro")
    page.locator('input[name="nombreCompleto"]').wait_for()
    time.sleep(2)


if __name__ == "__main__":
    run_store_demo("Ingreso y registro", "/login", revisar_acceso)
