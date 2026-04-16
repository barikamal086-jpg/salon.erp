"""
KAIA — Lançador de Receita
Módulo 2: Automação Playwright — preenche o formulário no Conta Azul Pro

PRÉ-REQUISITO:
    Abrir o Chrome com debug ativado:
    "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

    Depois logar no Conta Azul normalmente no Chrome.

USO:
    python kaia_lancar_receita.py
"""

import sys
import time
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

from kaia_parser import parse_relatorio, exibir_confirmacao

URL_RECEITAS = "https://pro.contaazul.com/"
TIMEOUT      = 880_000


def lancar_receita(page, dados: dict):

    input("\n🔑  Faça login no Conta Azul no Chrome e pressione Enter aqui para continuar...")
    print("📂  Navegando para Receitas...")
    page.goto(URL_RECEITAS, wait_until="domcontentloaded", timeout=30_000)
    time.sleep(3)

    print("➕  Clicando em Nova receita...")
    btn_nova = page.locator("button").filter(has_text="Nova receita").first
    btn_nova.wait_for(state="visible", timeout=TIMEOUT)
    btn_nova.click()
    time.sleep(1.5)

    print(f"📅  Preenchendo data: {dados['data']}")
    campo_data = page.locator("input[placeholder*='DD/MM']").filter(visible=True).first
    campo_data.wait_for(state="visible", timeout=TIMEOUT)
    campo_data.triple_click()
    campo_data.type(dados["data"], delay=50)
    page.keyboard.press("Tab")
    time.sleep(0.3)

    print("📝  Preenchendo descrição...")
    campo_desc = page.locator("input[placeholder*='escri']").filter(visible=True).first
    campo_desc.wait_for(state="visible", timeout=TIMEOUT)
    campo_desc.triple_click()
    campo_desc.type(dados["descricao"], delay=30)
    time.sleep(0.3)

    print(f"💰  Preenchendo valor: R$ {dados['valor']}")
    campo_valor = page.locator("input[placeholder*='0,00']").filter(visible=True).first
    campo_valor.wait_for(state="visible", timeout=TIMEOUT)
    campo_valor.click()
    page.keyboard.press("Control+A")
    page.keyboard.press("Delete")
    for char in dados["valor"]:
        page.keyboard.type(char, delay=60)
    time.sleep(0.3)

    print(f"🏷️   Selecionando categoria: {dados['categoria']}")
    btn_cat = page.locator("button").filter(has_text="Categoria").filter(visible=True).first
    btn_cat.click()
    time.sleep(0.5)
    page.keyboard.type(dados["categoria"], delay=40)
    time.sleep(0.5)
    opcao = page.locator(f"text={dados['categoria']}").filter(visible=True).first
    opcao.wait_for(state="visible", timeout=TIMEOUT)
    opcao.click()
    time.sleep(0.3)

    print("🏦  Selecionando conta...")
    btn_conta = page.locator("button").filter(has_text="Conta").filter(visible=True).first
    btn_conta.click()
    time.sleep(0.5)
    opcao_conta = page.locator(f"text={dados['conta']}").filter(visible=True).first
    opcao_conta.wait_for(state="visible", timeout=TIMEOUT)
    opcao_conta.click()
    time.sleep(0.3)

    print("✅  Marcando Recebido...")
    labels = page.locator("label").filter(has_text="Recebido").filter(visible=True).all()
    if labels:
        label_modal = max(labels, key=lambda l: l.bounding_box()["y"]) if len(labels) > 1 else labels[0]
        label_modal.click()
    time.sleep(0.3)

    print("💾  Salvando...")
    btn_salvar = page.locator("button").filter(has_text="Salvar").filter(visible=True).last
    btn_salvar.click()
    time.sleep(1.5)

    try:
        page.wait_for_selector("text=Lançamento criado com sucesso", timeout=8_000)
        print(f"\n✅  SUCESSO — R$ {dados['valor']} lançado em {dados['data']} ({dados['categoria']})")
        return True
    except PlaywrightTimeout:
        print("⚠️  Aplicando fix do React...")
        campo_valor.click()
        page.keyboard.press("End")
        page.keyboard.press("Backspace")
        page.keyboard.type(dados["valor"][-1], delay=60)
        time.sleep(0.3)
        btn_salvar.click()
        time.sleep(1.5)
        try:
            page.wait_for_selector("text=Lançamento criado com sucesso", timeout=8_000)
            print(f"\n✅  SUCESSO — R$ {dados['valor']} lançado em {dados['data']}")
            return True
        except PlaywrightTimeout:
            print("\n❌  Falha ao salvar. Verifique o Conta Azul.")
            return False


def main():
    print("\n🟡  KAIA — Lançador de Receita v2.0")
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

    try:
        dados = parse_relatorio(texto)
    except ValueError as e:
        print(f"\n{e}")
        sys.exit(1)

    if not exibir_confirmacao(dados):
        print("\n⛔  Cancelado.")
        sys.exit(0)

    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp("http://localhost:9222")
        except Exception:
            print("\n❌  Chrome não encontrado na porta 9222.")
            print("    Feche o Chrome e reabra com o comando:")
            print('    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222')
            sys.exit(1)

        context = browser.contexts[0]
        page = context.pages[0] if context.pages else context.new_page()

        try:
            sucesso = lancar_receita(page, dados)
        except Exception as e:
            print(f"\n❌  Erro inesperado: {e}")
            sucesso = False

    sys.exit(0 if sucesso else 1)


if __name__ == "__main__":
    main()
