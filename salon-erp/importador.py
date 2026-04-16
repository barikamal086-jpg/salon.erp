#!/usr/bin/env python3
"""
Importador Automático - Salon ERP
Lê Excel com faturamentos e insere no banco de dados SQLite
"""

import sqlite3
import re
from datetime import datetime
from pathlib import Path

# Caminhos
EXCEL_PATH = r"C:\Users\bari.NTMAD243\ARQUIVOS EM C\New Horizon\Kaia\Faturamento\2026\jan a  11 de abril.xlsx"
DB_PATH = r"C:\Users\bari.NTMAD243\salon-erp\backend\salon-erp.db"

def ler_excel():
    """Lê o arquivo Excel e retorna lista de dicionários"""
    try:
        import openpyxl
    except ImportError:
        print("❌ openpyxl não encontrado. Instale com: pip install openpyxl")
        return []

    try:
        wb = openpyxl.load_workbook(EXCEL_PATH)
        ws = wb.active

        dados = []
        for row in ws.iter_rows(min_row=2, values_only=True):  # Pula header
            data, descricao, tipo, valor = row

            # Pular linhas vazias
            if not data or not valor:
                continue

            # Converter data (DD/MM/YYYY -> YYYY-MM-DD)
            try:
                if isinstance(data, str):
                    data_obj = datetime.strptime(data, "%d/%m/%Y")
                else:
                    # Se for objeto datetime do Excel
                    data_obj = data

                data_formatada = data_obj.strftime("%Y-%m-%d")
            except Exception as e:
                print(f"⚠️  Erro ao converter data {data}: {e}")
                continue

            # Converter valor (remove R$, espaços, pontos de milhares e converte vírgula)
            try:
                if isinstance(valor, str):
                    valor_limpo = valor.replace("R$", "").strip()
                    valor_limpo = valor_limpo.replace(".", "").replace(",", ".")
                    valor_float = float(valor_limpo)
                else:
                    valor_float = float(valor)
            except Exception as e:
                print(f"⚠️  Erro ao converter valor {valor}: {e}")
                continue

            dados.append({
                "data": data_formatada,
                "total": round(valor_float, 2),
                "descricao": descricao or "Venda"
            })

        return dados

    except Exception as e:
        print(f"❌ Erro ao ler Excel: {e}")
        return []

def importar_para_bd(dados):
    """Insere dados no banco de dados SQLite"""
    if not dados:
        print("❌ Nenhum dado para importar")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        inseridos = 0
        duplicados = 0
        erros = 0

        for item in dados:
            try:
                # Tenta inserir
                cursor.execute("""
                    INSERT INTO faturamento (data, total, status, created_at, updated_at)
                    VALUES (?, ?, 0, datetime('now'), datetime('now'))
                """, (item["data"], item["total"]))
                inseridos += 1

            except sqlite3.IntegrityError:
                # Data duplicada (UNIQUE constraint)
                duplicados += 1
                print(f"⚠️  Data {item['data']} já existe (pulado)")

            except Exception as e:
                erros += 1
                print(f"❌ Erro ao inserir {item['data']}: {e}")

        conn.commit()
        conn.close()

        print(f"\n✅ Importação concluída!")
        print(f"   📊 Inseridos: {inseridos}")
        print(f"   ⚠️  Duplicados: {duplicados}")
        print(f"   ❌ Erros: {erros}")
        print(f"\n🎉 Total no banco: {inseridos} faturamentos")

    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")

def main():
    print("=" * 50)
    print("🎯 IMPORTADOR SALON ERP")
    print("=" * 50)

    # Verificar se arquivos existem
    if not Path(EXCEL_PATH).exists():
        print(f"❌ Arquivo Excel não encontrado: {EXCEL_PATH}")
        return

    if not Path(DB_PATH).exists():
        print(f"❌ Banco de dados não encontrado: {DB_PATH}")
        print("💡 Dica: Rode 'npm start' na pasta backend primeiro")
        return

    print(f"\n📂 Excel: {EXCEL_PATH}")
    print(f"💾 Database: {DB_PATH}\n")

    # Ler Excel
    print("📖 Lendo arquivo Excel...")
    dados = ler_excel()

    if not dados:
        print("❌ Nenhum dado foi lido do Excel")
        return

    print(f"✅ {len(dados)} faturamentos encontrados\n")

    # Mostrar preview
    print("Primeiros 5 registros:")
    for i, item in enumerate(dados[:5], 1):
        print(f"  {i}. Data: {item['data']} | Total: R$ {item['total']:.2f}")
    print("  ...\n")

    # Confirmar importação
    resposta = input("Deseja importar estes dados? (s/n): ").lower()
    if resposta != 's':
        print("❌ Importação cancelada")
        return

    # Importar
    print("\n⏳ Importando para o banco de dados...")
    importar_para_bd(dados)

if __name__ == "__main__":
    main()
