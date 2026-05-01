/**
 * Rota de DEBUG para verificar o que está acontecendo no banco
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const Faturamento = require('../models/Faturamento');

// GET /debug/database-status - Verificar status do banco de dados
router.get('/database-status', async (req, res) => {
  try {
    console.log('\n🔍 DEBUG: Database Status');

    // 1. Verificar conexão
    const connTest = await pool.query('SELECT NOW()');
    console.log('✅ Conexão PostgreSQL: OK');

    // 2. Contar registros totais
    const counts = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM faturamento) as total_faturamentos,
        (SELECT COUNT(*) FROM faturamento WHERE tipo = 'receita') as receitas,
        (SELECT COUNT(*) FROM faturamento WHERE tipo = 'despesa') as despesas,
        (SELECT COUNT(*) FROM tipo_despesa) as tipos_despesa,
        (SELECT COUNT(*) FROM restaurantes) as restaurantes
    `);

    console.log('📊 Registros no banco:', counts.rows[0]);

    // 3. Datas min/max
    const dates = await pool.query(`
      SELECT
        MIN(data)::text as data_minima,
        MAX(data)::text as data_maxima
      FROM faturamento
    `);

    console.log('📅 Range de datas:', dates.rows[0]);

    // 4. Amostra de dados
    const sample = await pool.query(`
      SELECT id, data, categoria, tipo, total
      FROM faturamento
      LIMIT 5
    `);

    console.log('📝 Amostra de 5 registros:');
    sample.rows.forEach(row => {
      console.log(`   ID ${row.id}: ${row.data} | ${row.categoria} | ${row.tipo} | R$ ${row.total}`);
    });

    res.json({
      success: true,
      data: {
        conexao: 'PostgreSQL OK',
        registros: counts.rows[0],
        datas: dates.rows[0],
        amostra: sample.rows
      }
    });
  } catch (err) {
    console.error('❌ Erro no debug:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET /debug/query - Simular a query do dashboard
router.get('/query', async (req, res) => {
  try {
    const from = req.query.from || '2026-04-01';
    const to = req.query.to || '2026-04-30';

    console.log(`\n🔍 DEBUG: Query simulada`);
    console.log(`   From: ${from}`);
    console.log(`   To: ${to}`);

    // Fazer a query RAW no PostgreSQL
    const rawResult = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'receita' THEN total ELSE 0 END), 0) as totalreceita,
        COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN total ELSE 0 END), 0) as totaldespesa
      FROM faturamento
      WHERE data >= $1 AND data <= $2
    `, [from, to]);

    console.log('📊 Resultado RAW:', rawResult.rows[0]);

    // Agora chamar via model
    const modelResult = await Faturamento.obterStats(from, to, null);
    console.log('📊 Resultado via Model:', modelResult);

    res.json({
      success: true,
      data: {
        periodo: { from, to },
        rawQuery: rawResult.rows[0],
        modelQuery: modelResult
      }
    });
  } catch (err) {
    console.error('❌ Erro:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET /debug/faturamentos-period - Listar faturamentos de um período
router.get('/faturamentos-period', async (req, res) => {
  try {
    const from = req.query.from || '2026-04-01';
    const to = req.query.to || '2026-04-30';

    console.log(`\n🔍 DEBUG: Faturamentos de ${from} a ${to}`);

    const result = await pool.query(`
      SELECT
        id, data, categoria, tipo, CAST(total AS DECIMAL(10,2)) as total
      FROM faturamento
      WHERE data >= $1 AND data <= $2
      ORDER BY data DESC
      LIMIT 20
    `, [from, to]);

    console.log(`✅ Encontrados ${result.rows.length} registros`);
    result.rows.forEach((row, i) => {
      console.log(`   ${i+1}. ${row.data} | ${row.categoria} | ${row.tipo} | R$ ${row.total}`);
    });

    res.json({
      success: true,
      periodo: { from, to },
      total: result.rows.length,
      registros: result.rows
    });
  } catch (err) {
    console.error('❌ Erro:', err.message);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
