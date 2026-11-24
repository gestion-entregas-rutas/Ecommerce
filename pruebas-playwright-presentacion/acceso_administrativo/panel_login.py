import os
import time
from getpass import getpass

from playwright.sync_api import sync_playwright

from common import ADMIN_URL, save_screenshot


if __name__ == "__main__":
    username = os.getenv("PRESENTACION_ADMIN_USUARIO") or input("Usuario administrador: ")
    password = os.getenv("PRESENTACION_ADMIN_CLAVE") or getpass("Contraseña administrador: ")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        try:
            page.goto(f"{ADMIN_URL}/login?returnUrl=%2Fresumen")
            time.sleep(2)
            page.locator('input[name="nombreUsuario"]').fill(username)
            page.locator('input[name="clave"]').fill(password)
            time.sleep(1)
            page.get_by_role("button", name="Ingresar").click()
            page.wait_for_url("**/resumen", timeout=15000)
            time.sleep(3)
            print("Ingreso correcto. Página actual:", page.url)
            save_screenshot(page, "panel-login-resumen")
        except Exception as error:
            print("No se completó el ingreso:", error)
            print("Revisa si las credenciales son correctas o si el panel muestra algún mensaje.")
            time.sleep(5)
        finally:
            browser.close()
