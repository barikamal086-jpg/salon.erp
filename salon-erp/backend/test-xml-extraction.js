/**
 * Script de teste para diagnosticar extração de data do XML
 * Use para debugar por que a data de emissão não está sendo extraída corretamente
 */

const fs = require('fs');
const path = require('path');
const NotaFiscalParser = require('./utils/NotaFiscalParser');

async function testXMLExtraction() {
  try {
    // Encontrar um arquivo XML na pasta uploads
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('📁 Criando pasta uploads...');
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('⚠️  Pasta uploads criada. Coloque um arquivo XML nela para testar.');
      return;
    }

    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.xml'));
    if (files.length === 0) {
      console.log('❌ Nenhum arquivo XML encontrado em ./uploads');
      console.log('📝 Instruções:');
      console.log('   1. Coloque um arquivo .xml na pasta ./uploads');
      console.log('   2. Execute este script novamente');
      return;
    }

    const xmlFile = files[0];
    console.log(`\n📄 Testando extração com: ${xmlFile}`);
    console.log('═'.repeat(60));

    const xmlPath = path.join(uploadsDir, xmlFile);
    const xmlBuffer = fs.readFileSync(xmlPath);

    console.log(`\n📊 Informações do arquivo:`);
    console.log(`   - Nome: ${xmlFile}`);
    console.log(`   - Tamanho: ${xmlBuffer.length} bytes`);

    console.log(`\n🔄 Executando parser...`);
    const resultado = await NotaFiscalParser.parseXML(xmlBuffer);

    console.log(`\n✅ Resultado da extração:`);
    console.log(JSON.stringify(resultado, null, 2));

    console.log(`\n🔍 Análise de datas:`);
    console.log(`   - Data de emissão: ${resultado.data_emissao}`);
    console.log(`   - Data de vencimento: ${resultado.data_vencimento}`);
    console.log(`   - Hoje: ${new Date().toISOString().split('T')[0]}`);
    console.log(`   - Data de emissão é hoje? ${resultado.data_emissao === new Date().toISOString().split('T')[0] ? '⚠️  SIM' : '✅ NÃO'}`);

  } catch (error) {
    console.error('❌ Erro ao testar extração:');
    console.error(error.message);
    console.error(error.stack);
  }
}

testXMLExtraction();
