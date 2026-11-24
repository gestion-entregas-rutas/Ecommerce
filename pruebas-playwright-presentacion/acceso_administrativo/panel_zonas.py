import time

from common import run_admin_demo


def cambiar_vista(page):
    vistas = page.get_by_role("tablist", name="Vista").get_by_role("button")
    if vistas.count() > 1:
        vistas.nth(1).click()
        time.sleep(2)
        vistas.nth(0).click()


if __name__ == "__main__":
    run_admin_demo("Zonas Geográficas", "/zonas", cambiar_vista)
