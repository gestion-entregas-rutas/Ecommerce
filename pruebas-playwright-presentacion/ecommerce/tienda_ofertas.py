import time

from common import run_store_demo


def filtrar_ofertas(page):
    page.locator('input[name="ofertas"]').check()
    time.sleep(2)
    page.get_by_role("button", name="Ofertas").click()
    time.sleep(2)


if __name__ == "__main__":
    run_store_demo("Ofertas", "/productos", filtrar_ofertas)
