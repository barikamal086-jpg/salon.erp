const xlsx = require('xlsx');
const ContaAzulMapper = require('./utils/ContaAzulMapper');

const arquivo = process.argv[2];
console.log(`\n📊 Lendo Excel: ${arquivo}\n`);

const workbook = xlsx.read(require('fs').readFileSync(arquivo), { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const linhas = xlsx.utils.sheet_to_json(worksheet);

console.log(`✅ Total de linhas: ${linhas.length}\n`);
console.log('📋 Primeiras 3 linhas:\n');

linhas.slice(0, 3).forEach((linha, i) => {
  console.log(`Linha ${i + 1}:`);
  console.log(JSON.stringify(linha, null, 2));
  console.log('');
  
  const dados = ContaAzulMapper.processarLinhaExcel(linha, i + 1);
  console.log('Processada:');
  console.log(JSON.stringify(dados, null, 2));
  console.log('---\n');
});
