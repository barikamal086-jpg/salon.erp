#!/usr/bin/env node

/**
 * Script CLI para importar Excel do Conta Azul
 *
 * Uso:
 * node importar-conta-azul-cli.js <caminho-do-arquivo.xlsx> [url-da-api]
 *
 * Exemplos:
 * node importar-conta-azul-cli.js ./conta-azul.xlsx
 * node importar-conta-azul-cli.js ./conta-azul.xlsx https://caixa360.up.railway.app/api
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Argumentos da linha de comando
const caminhoArquivo = process.argv[2];
const urlBase = process.argv[3] || 'http://localhost:5006/api';

// Validações
if (!caminhoArquivo) {
  console.error('❌ Erro: caminho do arquivo é obrigatório');
  console.error('\nUso: node importar-conta-azul-cli.js <arquivo.xlsx> [url-api]');
  console.error('\nExemplos:');
  console.error('  node importar-conta-azul-cli.js ./conta-azul.xlsx');
  console.error('  node importar-conta-azul-cli.js ./conta-azul.xlsx https://caixa360.up.railway.app/api');
  process.exit(1);
}

if (!fs.existsSync(caminhoArquivo)) {
  console.error(`❌ Erro: arquivo não encontrado: ${caminhoArquivo}`);
  process.exit(1);
}

async function importar() {
  try {
    console.log('\n📊 IMPORTADOR CONTA AZUL');
    console.log('='.repeat(80));
    console.log(`📁 Arquivo: ${caminhoArquivo}`);
    console.log(`🌐 API: ${urlBase}/importar-conta-azul`);
    console.log('='.repeat(80));

    // Preparar arquivo
    const nomeArquivo = path.basename(caminhoArquivo);
    const conteudoArquivo = fs.readFileSync(caminhoArquivo);

    console.log(`\n📤 Enviando arquivo... (${(conteudoArquivo.length / 1024).toFixed(2)} KB)`);

    // Criar FormData
    const FormData = require('form-data');
    const form = new FormData();
    form.append('arquivo', conteudoArquivo, nomeArquivo);

    // Enviar para API
    const response = await axios.post(`${urlBase}/importar-conta-azul`, form, {
      headers: form.getHeaders(),
      timeout: 300000 // 5 minutos
    });

    const resultado = response.data;

    // Exibir resultado
    console.log('\n✅ IMPORTAÇÃO CONCLUÍDA\n');
    console.log(`📊 Resumo:`);
    console.log(`   ✅ Importados: ${resultado.dados.importados}`);
    console.log(`   ⚠️  Duplicados: ${resultado.dados.duplicados}`);
    console.log(`   ❌ Erros: ${resultado.dados.erros}`);

    if (resultado.dados.importados > 0) {
      console.log(`\n📋 Primeiros 10 importados:`);
      resultado.dados.detalhes.importados.forEach((item, i) => {
        console.log(`   ${i + 1}. ${item.data} | ${item.tipo.toUpperCase().padEnd(8)} | R$ ${item.valor.toFixed(2).padEnd(10)} | ${item.categoria.padEnd(10)} | ${item.descricao.substring(0, 40)}`);
      });
    }

    if (resultado.dados.duplicados > 0 && resultado.dados.detalhes.duplicados.length > 0) {
      console.log(`\n⚠️  Primeiros 5 duplicados:`);
      resultado.dados.detalhes.duplicados.forEach((item, i) => {
        console.log(`   ${i + 1}. Linha ${item.linha} | ${item.descricao}`);
      });
    }

    if (resultado.dados.erros > 0 && resultado.dados.detalhes.erros.length > 0) {
      console.log(`\n❌ Primeiros 5 erros:`);
      resultado.dados.detalhes.erros.forEach((item, i) => {
        console.log(`   ${i + 1}. Linha ${item.linha} | ${item.erro}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✨ Importação finalizada com sucesso!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERRO NA IMPORTAÇÃO\n');

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Mensagem: ${error.response.data.error}`);
      if (error.response.data.stack) {
        console.error(`\nStack trace:\n${error.response.data.stack}`);
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`❌ Erro de conexão: API não está respondendo em ${urlBase}`);
      console.error('   Verifique se o servidor está rodando e a URL está correta');
    } else {
      console.error(`Erro: ${error.message}`);
    }

    console.error('\n' + '='.repeat(80) + '\n');
    process.exit(1);
  }
}

importar();
