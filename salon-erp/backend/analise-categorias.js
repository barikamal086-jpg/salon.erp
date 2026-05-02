const xlsx = require('xlsx');
const ContaAzulMapper = require('./utils/ContaAzulMapper');

const arquivo = process.argv[2];
const workbook = xlsx.read(require('fs').readFileSync(arquivo), { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const linhas = xlsx.utils.sheet_to_json(worksheet);

const categorias = {};

linhas.forEach(linha => {
  const cat = linha['Categoria 1'] || 'SEM CATEGORIA';
  if (!categorias[cat]) {
    categorias[cat] = { count: 0, total: 0, mapeado: null };
  }
  categorias[cat].count++;
  categorias[cat].total += Math.abs(parseFloat(String(linha['Valor (R$)'] || 0).replace(/[R$\s,]/g, '.')) || 0);
  
  const dados = ContaAzulMapper.processarLinhaExcel(linha, 1);
  if (dados.valid) {
    categorias[cat].mapeado = `${dados.classificacao}/${dados.subcategoria}`;
  }
});

console.log('\n📊 ANÁLISE DE CATEGORIAS\n');
console.log('Categoria Conta Azul'.padEnd(35) + ' | Qtd | Mapeado para ERP'.padEnd(35) + ' | Total');
console.log('-'.repeat(100));

Object.entries(categorias).sort((a, b) => b[1].total - a[1].total).forEach(([cat, info]) => {
  const status = info.mapeado === 'Operacional/Diversos' ? '⚠️  ' : '✅ ';
  console.log(status + cat.padEnd(30) + ' | ' + String(info.count).padEnd(4) + '| ' + (info.mapeado || 'NÃO MAPEADO').padEnd(32) + ' | R$ ' + info.total.toFixed(2));
});

console.log('\n');
