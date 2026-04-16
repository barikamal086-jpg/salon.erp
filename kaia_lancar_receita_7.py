import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from kaia_parser import parse_relatorio, exibir_confirmacao

URL_RECEITAS = "https://pro.contaazul.com/#/ca/financeiro/competencia"
PERFIL_DIR   = Path.home() / "kaia_chrome_perfil"
TIMEOUT      = 30_000

def lancar_receita(page, dados):
    print("📂  Navegando para Receitas...")
    page.goto(URL_RECEITAS, wait_until="domcontentloaded", timeout=60_000)
    time.sleep(3)
    if "login" in page.url.lower() or "auth" in page.url.lower():
        print("\n🔑  Faça login no Chrome que abriu e pressione Enter aqui...")
        input()
        page.goto(URL_RECEITAS, wait_until="domcontentloaded", timeout=60_000)
        time.sleep(3)
    print("➕  Clicando em Nova receita...")
    btn_nova = page.locator("button").filter(has_text="Nova receita").first
    btn_nova.wait_for(state="visible", timeout=TIMEOUT)
    btn_nova.click()
    time.sleep(1.5)
    print(f"📅  Data: {dados['data']}")
    campo_data = page.locator("input[placeholder*='DD/MM']").filter(visible=True).first
    campo_data.wait_for(state="visible", timeout=TIMEOUT)
    campo_data.triple_click()
    campo_data.type(dados["data"], delay=50)
    page.keyboard.press("Tab")
    time.sleep(0.3)
    print("📝  Descrição...")
    campo_desc = page.locator("input[placeholder*='escri']").filter(visible=True).first
    campo_desc.wait_for(state="visible", timeout=TIMEOUT)
    campo_desc.triple_click()
    campo_desc.type(dados["descricao"], delay=30)
    time.sleep(0.3)
    print(f"💰  Valor: R$ {dados['valor']}")
    campo_valor = page.locator("input[placeholder*='0,00']").filter(visible=True).first
    campo_valor.wait_for(state="visible", timeout=TIMEOUT)
    campo_valor.click()
    page.keyboard.press("Control+A")
    page.keyboard.press("Delete")
    for char in dados["valor"]:
        page.keyboard.type(char, delay=60)
    time.sleep(0.3)
    print(f"🏷️  Categoria: {dados['categoria']}")
    btn_cat = page.locator("button").filter(has_text="Categoria").filter(visible=True).first
    btn_cat.click()
    time.sleep(0.5)
    page.keyboard.type(dados["categoria"], delay=40)
    time.sleep(0.5)
    opcao = page.locator(f"text={dados['categoria']}").filter(visible=True).first
    opcao.wait_for(state="visible", timeout=TIMEOUT)
    opcao.click()
    time.sleep(0.3)
    print("🏦  Conta...")
    btn_conta = page.locator("button").filter(has_text="Conta").filter(visible=True).first
    btn_conta.click()
    time.sleep(0.5)
    opcao_conta = page.locator(f"text={dados['conta']}").filter(visible=True).first
    opcao_conta.wait_for(state="visible", timeout=TIMEOUT)
    opcao_conta.click()
    time.sleep(0.3)
    print("✅  Recebido...")
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
        print(f"\n✅  SUCESSO — R$ {dados['valor']} em {dados['data']} ({dados['categoria']})")
        return True
    except PlaywrightTimeout:
        print("⚠️  Fix React...")
        campo_valor.click()
        page.keyboard.press("End")
        page.keyboard.press("Backspace")
        page.keyboard.type(dados["valor"][-1], delay=60)
        time.sleep(0.3)
        btn_salvar.click()
        time.sleep(1.5)
        try:
            page.wait_for_selector("text=Lançamento criado com sucesso", timeout=8_000)
            print(f"\n✅  SUCESSO — R$ {dados['valor']} em {dados['data']}")
            return True
        except PlaywrightTimeout:
            print("\n❌  Falha ao salvar.")
            return False

def main():
    print("\n🟡  KAIA — Lançador de Receita v3.0")
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
    PERFIL_DIR.mkdir(exist_ok=True)
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(PERFIL_DIR),
            headless=False,
            args=["--start-maximized"],
            viewport=None,
        )
        page = context.pages[0] if context.pages else context.new_page()
        try:
            sucesso = lancar_receita(page, dados)
        except Exception as e:
            print(f"\n❌  Erro inesperado: {e}")
            sucesso = False
        finally:
            time.sleep(2)
            context.close()
    sys.exit(0 if sucesso else 1)

if __name__ == "__main__":
    main()