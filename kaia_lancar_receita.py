"""
KAIA — Lançador de Receita
Módulo 2: Automação Playwright — preenche o formulário no Conta Azul Pro

Depende do Módulo 1 (kaia_parser.py) para extrair os dados do relatório.

USO:
    python3 kaia_lancar_receita.py

SESSÃO:
    Na primeira execução o browser abre e você faz login manualmente.
    A sessão é salva em ./kaia_session e reutilizada nas próximas execuções.
"""

import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# Importa o Módulo 1
from kaia_parser import parse_relatorio, exibir_confirmacao

# ─── Configuração ────────────────────────────────────────────────────────────

URL_CONTA_AZUL   = "https://pro.contaazul.com"
SESSION_DIR      = Path("./kaia_session")   # pasta onde a sessão é salva
TIMEOUT          = 15_000                   # ms — timeout padrão de espera

# ─── Helpers ─────────────────────────────────────────────────────────────────

def digitar_valor(page, selector_hint: str, valor: str):
    """
    Preenche o campo Valor caractere a caractere via teclado.
    OBRIGATÓRIO por causa do bug do React no Conta Azul:
    valores colados ou inseridos via JS não disparam o evento correto
    e travam o botão Salvar.
    """
    campo = page.locator(selector_hint).filter(visible=True).first
    campo.click()
    page.keyboard.press("Control+A")
    page.keyboard.press("Delete")
    for char in valor:
        page.keyboard.type(char, delay=50)
    time.sleep(0.3)


def clicar_elemento_visivel(page, texto: str):
    """Clica no primeiro elemento visível que contém o texto."""
    el = page.locator(f"text={texto}").filter(visible=True).first
    el.wait_for(state="visible", timeout=TIMEOUT)
    el.click()


def abrir_browser(playwright, headless=False):
    """
    Abre o browser com sessão persistente.
    Na primeira vez: abre headed para login manual.
    Nas seguintes: reutiliza a sessão salva.
    """
    SESSION_DIR.mkdir(exist_ok=True)
    browser = playwright.chromium.launch_persistent_context(
        user_data_dir=str(SESSION_DIR),
        headless=headless,
        viewport={"width": 1280, "height": 800},
        args=["--start-maximized"],
    )
    return browser

# ─── Fluxo principal ──────────────────────────────────────────────────────────

def lancar_receita(page, dados: dict):
    """
    Executa o fluxo completo de lançamento no Conta Azul Pro.
    Recebe o dicionário de dados já validado pelo Módulo 1.
    """

    print("\n🌐  Abrindo Conta Azul Pro...")
    page.goto(URL_CONTA_AZUL, wait_until="networkidle")

    # Verifica se está logado
    if "login" in page.url.lower() or "auth" in page.url.lower():
        print("\n⚠️  Sessão expirada. Faça login manualmente no browser.")
        print("   Pressione Enter aqui quando estiver logado...")
        input()
        page.goto(URL_CONTA_AZUL, wait_until="networkidle")

    # ── Passo 1: Navegar para Financeiro > Receitas ──────────────────────────
    print("📂  Navegando para Receitas...")
    page.goto(f"{URL_CONTA_AZUL}/financial/revenues", wait_until="networkidle")
    time.sleep(1)

    # ── Passo 2: Abrir modal "Nova receita" ──────────────────────────────────
    print("➕  Clicando em Nova receita...")
    btn_nova = page.locator("button", has_text="Nova receita").filter(visible=True).first
    btn_nova.wait_for(state="visible", timeout=TIMEOUT)
    btn_nova.click()
    time.sleep(1)

    # ── Passo 3: Preencher Data ───────────────────────────────────────────────
    print(f"📅  Preenchendo data: {dados['data']}")
    campo_data = page.locator("input[placeholder*='DD/MM']").filter(visible=True).first
    campo_data.wait_for(state="visible", timeout=TIMEOUT)
    campo_data.triple_click()
    campo_data.type(dados["data"], delay=50)
    page.keyboard.press("Tab")
    time.sleep(0.3)

    # ── Passo 4: Preencher Descrição ─────────────────────────────────────────
    print(f"📝  Preenchendo descrição: {dados['descricao']}")
    campo_desc = page.locator("input[placeholder*='escri']").filter(visible=True).first
    campo_desc.wait_for(state="visible", timeout=TIMEOUT)
    campo_desc.triple_click()
    campo_desc.type(dados["descricao"], delay=30)
    time.sleep(0.3)

    # ── Passo 5: Preencher Valor (via teclado — bug React) ───────────────────
    print(f"💰  Preenchendo valor: R$ {dados['valor']}")
    campo_valor = page.locator("input[placeholder*='0,00']").filter(visible=True).first
    campo_valor.wait_for(state="visible", timeout=TIMEOUT)
    campo_valor.click()
    page.keyboard.press("Control+A")
    page.keyboard.press("Delete")
    for char in dados["valor"]:
        page.keyboard.type(char, delay=60)
    time.sleep(0.3)

    # ── Passo 6: Selecionar Categoria ────────────────────────────────────────
    print(f"🏷️   Selecionando categoria: {dados['categoria']}")
    # Abre o dropdown de categoria
    btn_cat = page.locator("button", has_text="Categoria").filter(visible=True).first
    if btn_cat.count() == 0:
        # Tenta pelo placeholder do select
        btn_cat = page.locator("[data-testid*='categoria'], [aria-label*='ategoria']").filter(visible=True).first
    btn_cat.click()
    time.sleep(0.5)

    # Digita para filtrar
    page.keyboard.type(dados["categoria"], delay=40)
    time.sleep(0.5)

    # Clica na opção
    opcao = page.locator(f"text={dados['categoria']}").filter(visible=True).first
    opcao.wait_for(state="visible", timeout=TIMEOUT)
    opcao.click()
    time.sleep(0.3)

    # ── Passo 7: Selecionar Conta de recebimento ─────────────────────────────
    print(f"🏦  Selecionando conta: {dados['conta']}")
    btn_conta = page.locator("button", has_text="Conta").filter(visible=True).first
    btn_conta.click()
    time.sleep(0.5)

    opcao_conta = page.locator(f"text={dados['conta']}").filter(visible=True).first
    opcao_conta.wait_for(state="visible", timeout=TIMEOUT)
    opcao_conta.click()
    time.sleep(0.3)

    # ── Passo 8: Marcar checkbox Recebido ────────────────────────────────────
    print("✅  Marcando Recebido...")
    # Pega o label Recebido visível com maior coordenada Y (o do modal, não o rollover)
    labels = page.locator("label", has_text="Recebido").filter(visible=True).all()
    if labels:
        if len(labels) > 1:
            # Pega o de maior Y (mais abaixo na tela = modal)
            label_modal = max(labels, key=lambda l: l.bounding_box()["y"])
        else:
            label_modal = labels[0]
        label_modal.click()
    time.sleep(0.3)

    # ── Passo 9: Salvar ───────────────────────────────────────────────────────
    print("💾  Clicando em Salvar...")
    btn_salvar = page.locator("button[type='submit'], button", has_text="Salvar").filter(visible=True).last
    btn_salvar.click()
    time.sleep(1.5)

    # ── Passo 10: Verificar sucesso ───────────────────────────────────────────
    try:
        page.wait_for_selector(
            "text=Lançamento criado com sucesso",
            timeout=8_000
        )
        print(f"\n✅  SUCESSO — R$ {dados['valor']} lançado em {dados['data']} ({dados['categoria']})")
        return True
    except PlaywrightTimeout:
        # Tenta fix do React: redigita último dígito do valor
        print("⚠️  Salvar não respondeu. Aplicando fix do React...")
        campo_valor.click()
        page.keyboard.press("End")
        page.keyboard.press("Backspace")
        ultimo_digito = dados["valor"][-1]
        page.keyboard.type(ultimo_digito, delay=60)
        time.sleep(0.3)
        btn_salvar.click()
        time.sleep(1.5)

        try:
            page.wait_for_selector("text=Lançamento criado com sucesso", timeout=8_000)
            print(f"\n✅  SUCESSO (após fix) — R$ {dados['valor']} lançado em {dados['data']}")
            return True
        except PlaywrightTimeout:
            print("\n❌  Falha ao salvar. Verifique o browser e tente novamente.")
            return False

# ─── Entrypoint ───────────────────────────────────────────────────────────────

def main():
    print("\n🟡  KAIA — Lançador de Receita v1.0")
    print("Cole o relatório do WhatsApp e pressione Enter duas vezes:\n")

    linhas = []
    while True:
        linha = input()
        if linha == "":
            if linhas:
                break
        else:
            linhas.append(linha)

    texto = "\n".join(linhas)

    # Módulo 1 — parser
    try:
        dados = parse_relatorio(texto)
    except ValueError as e:
        print(f"\n{e}")
        sys.exit(1)

    # Confirmação
    if not exibir_confirmacao(dados):
        print("\n⛔  Cancelado.")
        sys.exit(0)

    # Módulo 2 — automação
    with sync_playwright() as p:
        browser = abrir_browser(p)
        page = browser.pages[0] if browser.pages else browser.new_page()

        try:
            sucesso = lancar_receita(page, dados)
        except Exception as e:
            print(f"\n❌  Erro inesperado: {e}")
            sucesso = False
        finally:
            if sucesso:
                time.sleep(2)   # pausa para visualizar confirmação
            browser.close()

    sys.exit(0 if sucesso else 1)


if __name__ == "__main__":
    main()
