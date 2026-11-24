import time

from common import run_admin_demo


def revisar_dashboard(page):
    page.get_by_role("heading", name="Mapa de operaciones").wait_for()
    page.get_by_role("heading", name="Pedidos de hoy").wait_for()
    page.get_by_role("region", name="Indicadores del día").wait_for()
    time.sleep(2)
    page.get_by_role("button", name="Refrescar datos").click()
    time.sleep(2)


if __name__ == "__main__":
    run_admin_demo("Centro de Control", "/resumen", revisar_dashboard)
