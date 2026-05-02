const xlsx = require('xlsx');
const path = require('path');

// Create sample data in Conta Azul format
const testData = [
  {
    'Data de competência': '01/05/2026',
    'Descrição': 'Aluguel salão - maio',
    'Nome do fornecedor/cliente': 'Proprietário Imóvel',
    'Valor (R$)': '-2500',
    'Categoria 1': 'Aluguel',
    'Identificador': 'CA-2026-001'
  },
  {
    'Data de competência': '02/05/2026',
    'Descrição': 'Compra bebidas variadas',
    'Nome do fornecedor/cliente': 'Distribuidor XYZ',
    'Valor (R$)': '-450',
    'Categoria 1': 'Bebidas',
    'Identificador': 'CA-2026-002'
  },
  {
    'Data de competência': '03/05/2026',
    'Descrição': 'Compra carnes variadas',
    'Nome do fornecedor/cliente': 'Açougue ABC',
    'Valor (R$)': '-800',
    'Categoria 1': 'Carne',
    'Identificador': 'CA-2026-003'
  },
  {
    'Data de competência': '04/05/2026',
    'Descrição': 'Energia elétrica abril',
    'Nome do fornecedor/cliente': 'Companhia de Energia',
    'Valor (R$)': '-350',
    'Categoria 1': 'Energia elétrica',
    'Identificador': 'CA-2026-004'
  },
  {
    'Data de competência': '05/05/2026',
    'Descrição': 'Folha de pagamento',
    'Nome do fornecedor/cliente': 'Funcionários',
    'Valor (R$)': '-3000',
    'Categoria 1': 'Salário',
    'Identificador': 'CA-2026-005'
  },
  {
    'Data de competência': '06/05/2026',
    'Descrição': 'Embalagens e descartáveis',
    'Nome do fornecedor/cliente': 'Fornecedor Embalagens',
    'Valor (R$)': '-150',
    'Categoria 1': 'Descartáveis',
    'Identificador': 'CA-2026-006'
  },
  {
    'Data de competência': '07/05/2026',
    'Descrição': 'Frutas e verduras',
    'Nome do fornecedor/cliente': 'Distribuidor Hortifruti',
    'Valor (R$)': '-300',
    'Categoria 1': 'Hortifruti',
    'Identificador': 'CA-2026-007'
  },
  {
    'Data de competência': '08/05/2026',
    'Descrição': 'Taxas iFood maio',
    'Nome do fornecedor/cliente': 'iFood',
    'Valor (R$)': '-250',
    'Categoria 1': 'Taxas iFood',
    'Identificador': 'CA-2026-008'
  }
];

// Create workbook
const workbook = xlsx.utils.book_new();
const worksheet = xlsx.utils.json_to_sheet(testData);

// Adjust column widths
worksheet['!cols'] = [
  { wch: 18 }, // Data
  { wch: 30 }, // Descrição
  { wch: 25 }, // Nome fornecedor
  { wch: 15 }, // Valor
  { wch: 20 }, // Categoria
  { wch: 15 }  // Identificador
];

xlsx.utils.book_append_sheet(workbook, worksheet, 'Movimentação');

// Save file
const filePath = path.join(__dirname, '..', 'conta-azul-test.xlsx');
xlsx.writeFile(workbook, filePath);

console.log(`✅ Test file created: ${filePath}`);
