"""Helpers for headed Playwright presentation walkthroughs."""

import os
import re
import time
from getpass import getpass
from collections.abc import Callable

from playwright.sync_api import Page, sync_playwright

STORE_URL = os.getenv("PRESENTACION_TIENDA_URL", "http://localhost:5330")
ADMIN_URL = os.getenv("PRESENTACION_ADMIN_URL", "http://localhost:5290")
EVIDENCE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "evidencias")


def save_screenshot(page: Page, module: str) -> None:
    os.makedirs(EVIDENCE_DIR, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", module.lower()).strip("-")
    page.screenshot(path=os.path.join(EVIDENCE_DIR, f"{slug}.png"), full_page=True)


def run_store_demo(module: str, route: str, action: Callable[[Page], None] | None = None) -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        try:
            print(f"\n=== TIENDA: {module} ===")
            page.goto(f"{STORE_URL}{route}", wait_until="domcontentloaded", timeout=20000)
            time.sleep(2)
            if action:
                action(page)
            time.sleep(2)
            save_screenshot(page, f"tienda-{module}")
        finally:
            browser.close()


def run_store_login_demo() -> None:
    username = os.getenv("PRESENTACION_CLIENTE_USUARIO") or input("Usuario o correo del cliente: ")
    password = os.getenv("PRESENTACION_CLIENTE_CLAVE") or getpass("Contraseña del cliente: ")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        try:
            print("\n=== ECOMMERCE: inicio de sesión ===")
            page.goto(f"{STORE_URL}/login?returnUrl=%2Fmi-cuenta", wait_until="domcontentloaded", timeout=20000)
            time.sleep(2)
            page.locator('input[name="usuarioOCorreo"]').fill(username)
            page.locator('input[name="password"]').fill(password)
            time.sleep(1)
            page.get_by_role("button", name="Ingresar").click()
            page.wait_for_url("**/mi-cuenta", timeout=15000)
            time.sleep(3)
            print("Ingreso correcto. Página actual:", page.url)
            save_screenshot(page, "ecommerce-inicio-sesion")
        except Exception as error:
            print("No se completó el ingreso:", error)
            print("Revisa las credenciales o el mensaje que muestra la tienda.")
            time.sleep(5)
        finally:
            browser.close()


def run_admin_demo(module: str, route: str, action: Callable[[Page], None] | None = None) -> None:
    username = os.getenv("PRESENTACION_ADMIN_USUARIO") or input("Usuario administrador: ")
    password = os.getenv("PRESENTACION_ADMIN_CLAVE") or getpass("Contraseña administrador: ")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        try:
            print(f"\n=== PANEL: {module} ===")
            page.goto(f"{ADMIN_URL}/login", wait_until="domcontentloaded", timeout=20000)
            time.sleep(1)
            page.locator('input[name="nombreUsuario"]').fill(username)
            page.locator('input[name="clave"]').fill(password)
            page.get_by_role("button", name="Ingresar").click()
            page.wait_for_url("**/resumen", timeout=15000)
            time.sleep(2)
            page.goto(f"{ADMIN_URL}{route}", wait_until="domcontentloaded", timeout=20000)
            page.locator("h1").first.wait_for(timeout=15000)
            time.sleep(2)
            if action:
                action(page)
            time.sleep(2)
            save_screenshot(page, f"panel-{module}")
        finally:
            browser.close()
