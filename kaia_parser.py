import re
from datetime import datetime

# Mapeamento dia da semana → categoria Conta Azul
CATEGORIA = {
    "terça":   "Receita Terça",
    "terca":   "Receita Terça",
    "quarta":  "Receita Quarta",
    "quinta":  "Receita Quinta",
    "sexta":   "Receita Sexta",
    "sábado":  "Receita Sábado",
    "sabado":  "Receita Sábado",
}

# Campos fixos
DESCRICAO = "Venda de Lanches e Bebidas"
CONTA     = "Conta corrente- Pagseguro"


def parse_relatorio(texto: str) -> dict:
    """
    Extrai data, valor e categoria do relatório de fechamento do WhatsApp.
    Retorna dicionário com os dados ou levanta ValueError com mensagem clara.
    """

    # --- Data ---
    # Aceita formatos: "05/04/2026", "5/4/2026", "09/04/26"
    match_data = re.search(r'\b(\d{1,2}/\d{1,2}/\d{2,4})\b', texto)
    if not match_data:
        raise ValueError("❌ Data não encontrada. Esperado formato DD/MM/AAAA.")
    data_str = match_data.group(1)

    # Normaliza para DD/MM/YYYY
    partes = data_str.split("/")
    if len(partes[2]) == 2:
        partes[2] = "20" + partes[2]   # 26 → 2026
    data_str = "/".join(partes)
    data_obj = datetime.strptime(data_str, "%d/%m/%Y")
    data_fmt = data_obj.strftime("%d/%m/%Y")

    # --- Dia da semana ---
    # Tenta extrair do texto primeiro
    texto_lower = texto.lower()
    dia_encontrado = None
    for dia in CATEGORIA:
        if dia in texto_lower:
            dia_encontrado = dia
            break

    # Se não achou no texto, calcula pela data
    if not dia_encontrado:
        nomes = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
        dia_calculado = nomes[data_obj.weekday()]
        dia_lower = dia_calculado.lower().replace("á", "a").replace("ç", "c")
        # busca na tabela com e sem acento
        for dia in CATEGORIA:
            if dia in dia_calculado or dia in dia_lower:
                dia_encontrado = dia
                break

    if not dia_encontrado:
        raise ValueError(f"❌ Dia da semana fora do funcionamento da KAIA (Terça–Sábado). Data: {data_fmt}")

    categoria = CATEGORIA[dia_encontrado]

    # --- Valor (Total Salão) ---
    # Aceita: "13.449,29" ou "13449,29" ou "R$ 13.449,29"
    match_valor = re.search(
        r'(?:total\s+sal[aã]o|total)[\s:R$]*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})',
        texto_lower
    )
    if not match_valor:
        # Tenta qualquer valor monetário no texto como fallback
        match_valor = re.search(r'R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})', texto)

    if not match_valor:
        raise ValueError("❌ Valor (Total Salão) não encontrado no relatório.")

    valor_str = match_valor.group(1)

    return {
        "data":      data_fmt,
        "dia":       dia_encontrado,
        "valor":     valor_str,
        "categoria": categoria,
        "descricao": DESCRICAO,
        "conta":     CONTA,
        "recebido":  True,
    }


def exibir_confirmacao(dados: dict) -> bool:
    """Exibe os dados extraídos e pede confirmação do usuário."""
    print("\n" + "="*50)
    print("📋  DADOS EXTRAÍDOS — aguardando confirmação")
    print("="*50)
    print(f"   Data:      {dados['data']} ({dados['dia'].capitalize()})")
    print(f"   Valor:     R$ {dados['valor']}")
    print(f"   Categoria: {dados['categoria']}")
    print(f"   Descrição: {dados['descricao']}")
    print(f"   Conta:     {dados['conta']}")
    print(f"   Recebido:  ✅")
    print("="*50)

    resposta = input("\n   Confirmar lançamento? [s/n]: ").strip().lower()
    return resposta == "s"


def main():
    print("\n🟡  KAIA — Lançador de Receita")
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
        return

    confirmado = exibir_confirmacao(dados)

    if confirmado:
        print("\n✅  Dados validados. Pronto para o Módulo 2 (automação Playwright).")
        # Aqui o Módulo 2 receberá o dicionário `dados`
    else:
        print("\n⛔  Lançamento cancelado pelo usuário.")


if __name__ == "__main__":
    main()
