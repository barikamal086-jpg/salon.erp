/**
 * Testes unitários para parseBrasilValue()
 * Execute com: node backend/utils/test-numberParser.js
 */

const { parseBrasilValue, formatBrasilValue } = require('./numberParser');

console.log('🧪 TESTES: parseBrasilValue()\n');

const testCases = [
  // [Input, ExpectedOutput, Description]
  ["3.631,52", 3631.52, "Formato completo BR (com milhar)"],
  ["36.315,20", 36315.20, "Formato completo BR maior"],
  ["36315,20", 36315.20, "Sem ponto de milhar"],
  ["3,50", 3.50, "Pequeno valor"],
  ["1000", 1000, "Inteiro sem separadores"],
  ["1.000", 1.000, "Ponto sozinho (ambíguo, deixa como decimal)"],
  [3631.52, 3631.52, "Já é número"],
  ["0,01", 0.01, "Centavos"],
  ["69.812,56", 69812.56, "Receita Keeta"],
];

let passed = 0;
let failed = 0;

testCases.forEach(([input, expected, desc]) => {
  const result = parseBrasilValue(input);
  const isCorrect = Math.abs(result - expected) < 0.001; // Tolerância para float

  const status = isCorrect ? '✅' : '❌';
  console.log(`${status} ${desc}`);
  console.log(`   Input:    ${JSON.stringify(input)}`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Got:      ${result}`);

  if (isCorrect) {
    passed++;
  } else {
    failed++;
  }
  console.log('');
});

console.log(`\n📊 RESULTADO: ${passed} passou, ${failed} falhou de ${testCases.length}`);

if (failed === 0) {
  console.log('🎉 TODOS OS TESTES PASSARAM!');
} else {
  console.log(`❌ ${failed} TESTE(S) FALHARAM!`);
  process.exit(1);
}
