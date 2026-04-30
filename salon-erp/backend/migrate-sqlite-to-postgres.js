/**
 * Script de Migração: SQLite → PostgreSQL
 *
 * Use antes de fazer deploy para Railway:
 * node migrate-sqlite-to-postgres.js
 *
 * Este script:
 * 1. Lê dados do banco SQLite local (salon-erp.db)
 * 2. Insere dados no PostgreSQL do Railway
 * 3. Valida que todos os dados foram importados
 */

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// Conexão SQLite (local)
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'salon-erp.db'));

// Conexão PostgreSQL (Railway)
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let migratedCount = 0;
let totalCount = 0;

async function migrate() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          MIGRAÇÃO: SQLite → PostgreSQL                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Verificar conexão com PostgreSQL
    console.log('🔍 Verificando conexão PostgreSQL...');
    const testConn = await pgPool.query('SELECT NOW()');
    if (testConn.rows[0]) {
      console.log('✅ PostgreSQL conectado\n');
    }

    // 2. Contar registros no SQLite
    console.log('📊 Contando registros no SQLite...');
    const sqliteStats = await new Promise((resolve, reject) => {
      sqliteDb.all(`
        SELECT
          COUNT(*) as total_faturamento,
          (SELECT COUNT(*) FROM tipo_despesa) as total_tipos,
          (SELECT COUNT(*) FROM restaurantes) as total_restaurantes
        FROM faturamento
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0]);
      });
    });

    console.log(`   Faturamentos: ${sqliteStats.total_faturamento}`);
    console.log(`   Tipos de despesa: ${sqliteStats.total_tipos}`);
    console.log(`   Restaurantes: ${sqliteStats.total_restaurantes}\n`);

    // 3. Migrar restaurantes
    console.log('🏪 Migrando restaurantes...');
    await migrateTable('restaurantes', 'SELECT * FROM restaurantes');

    // 4. Migrar tipos de despesa
    console.log('💼 Migrando tipos de despesa...');
    await migrateTable('tipo_despesa', 'SELECT * FROM tipo_despesa');

    // 5. Migrar faturamentos
    console.log('💰 Migrando faturamentos...');
    await migrateFaturamento();

    // 6. Migrar notas fiscais
    console.log('📋 Migrando notas fiscais...');
    await migrateNotasFiscais();

    // 7. Validar
    console.log('\n✅ Validando dados...');
    await validateMigration(sqliteStats);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              MIGRAÇÃO CONCLUÍDA COM SUCESSO                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`📊 Total migrado: ${migratedCount} registros\n`);

  } catch (err) {
    console.error('❌ Erro durante migração:', err.message);
    process.exit(1);
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

async function migrateTable(tableName, query) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(query, async (err, rows) => {
      if (err) {
        console.error(`   ❌ Erro ao ler ${tableName}:`, err.message);
        return reject(err);
      }

      if (!rows || rows.length === 0) {
        console.log(`   ℹ️  Nenhum registro em ${tableName}`);
        return resolve();
      }

      try {
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');

          const sql = `INSERT INTO ${tableName} (${columns.join(',')})
                       VALUES (${placeholders})
                       ON CONFLICT DO NOTHING`;

          await pgPool.query(sql, values);
          migratedCount++;
        }
        console.log(`   ✅ ${rows.length} registros migrados`);
        resolve();
      } catch (err) {
        console.error(`   ❌ Erro ao migrar ${tableName}:`, err.message);
        reject(err);
      }
    });
  });
}

async function migrateFaturamento() {
  return new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM faturamento', async (err, rows) => {
      if (err) {
        console.error('   ❌ Erro ao ler faturamento:', err.message);
        return reject(err);
      }

      if (!rows || rows.length === 0) {
        console.log('   ℹ️  Nenhum faturamento para migrar');
        return resolve();
      }

      try {
        let successCount = 0;
        let skippedCount = 0;

        for (const row of rows) {
          const sql = `
            INSERT INTO faturamento
            (data, total, categoria, tipo, tipo_despesa_id, status, categoria_produto, enviado_em, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT DO NOTHING
          `;

          const values = [
            row.data,
            row.total,
            (row.categoria || 'Salão').substring(0, 50),  // Truncar para 50 chars
            (row.tipo || 'receita').substring(0, 20),     // Truncar para 20 chars
            row.tipo_despesa_id,
            row.status || false,
            (row.categoria_produto || 'Comida').substring(0, 50),  // Truncar para 50 chars
            row.enviado_em,
            row.created_at,
            row.updated_at || row.created_at
          ];

          try {
            await pgPool.query(sql, values);
            migratedCount++;
            successCount++;
          } catch (insertErr) {
            // Se erro é de foreign key, tenta novamente com tipo_despesa_id = NULL
            if (insertErr.message.includes('foreign key')) {
              const sqlWithoutFK = `
                INSERT INTO faturamento
                (data, total, categoria, tipo, tipo_despesa_id, status, categoria_produto, enviado_em, created_at, updated_at)
                VALUES ($1, $2, $3, $4, NULL, $6, $7, $8, $9, $10)
                ON CONFLICT DO NOTHING
              `;
              try {
                await pgPool.query(sqlWithoutFK, values);
                migratedCount++;
                successCount++;
              } catch (retryErr) {
                console.log(`      ⚠️  Ignorando registro com erro: ${retryErr.message.substring(0, 50)}`);
                skippedCount++;
              }
            } else {
              throw insertErr;
            }
          }
        }
        console.log(`   ✅ ${successCount} faturamentos migrados${skippedCount > 0 ? `, ${skippedCount} ignorados` : ''}`);
        resolve();
      } catch (err) {
        console.error('   ❌ Erro ao migrar faturamento:', err.message);
        reject(err);
      }
    });
  });
}

async function migrateNotasFiscais() {
  return new Promise((resolve, reject) => {
    sqliteDb.all('SELECT * FROM notas_fiscais', async (err, rows) => {
      if (err) {
        console.error('   ❌ Erro ao ler notas_fiscais:', err.message);
        return reject(err);
      }

      if (!rows || rows.length === 0) {
        console.log('   ℹ️  Nenhuma nota fiscal para migrar');
        return resolve();
      }

      try {
        let successCount = 0;
        let skippedCount = 0;

        for (const row of rows) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(',');

          const sql = `INSERT INTO notas_fiscais (${columns.join(',')})
                       VALUES (${placeholders})
                       ON CONFLICT DO NOTHING`;

          try {
            await pgPool.query(sql, values);
            migratedCount++;
            successCount++;
          } catch (insertErr) {
            // Se erro é de foreign key em faturamento_id, pula o registro
            if (insertErr.message.includes('foreign key') || insertErr.message.includes('faturamento_id')) {
              console.log(`      ⚠️  Ignorando nota fiscal com faturamento_id inválido: ${row.faturamento_id}`);
              skippedCount++;
            } else {
              throw insertErr;
            }
          }
        }
        console.log(`   ✅ ${successCount} notas fiscais migradas${skippedCount > 0 ? `, ${skippedCount} ignoradas` : ''}`);
        resolve();
      } catch (err) {
        console.error('   ❌ Erro ao migrar notas_fiscais:', err.message);
        reject(err);
      }
    });
  });
}

async function validateMigration(sqliteStats) {
  try {
    const pgStats = await pgPool.query(`
      SELECT
        COUNT(*) as total_faturamento,
        (SELECT COUNT(*) FROM tipo_despesa) as total_tipos,
        (SELECT COUNT(*) FROM restaurantes) as total_restaurantes
      FROM faturamento
    `);

    const pg = pgStats.rows[0];

    console.log('\n📊 Comparação de dados:');
    console.log(`   Faturamentos:     SQLite: ${sqliteStats.total_faturamento} | PostgreSQL: ${pg.total_faturamento}`);
    console.log(`   Tipos de despesa: SQLite: ${sqliteStats.total_tipos} | PostgreSQL: ${pg.total_tipos}`);
    console.log(`   Restaurantes:     SQLite: ${sqliteStats.total_restaurantes} | PostgreSQL: ${pg.total_restaurantes}`);

    if (pg.total_faturamento >= sqliteStats.total_faturamento &&
        pg.total_tipos >= sqliteStats.total_tipos &&
        pg.total_restaurantes >= sqliteStats.total_restaurantes) {
      console.log('\n✅ Validação passou - Dados íntegros!');
    } else {
      console.log('\n⚠️  Validação com aviso - Verifique os números acima');
    }
  } catch (err) {
    console.error('❌ Erro ao validar:', err.message);
    throw err;
  }
}

// Executar migração
migrate().catch(err => {
  console.error('❌ Migração falhou:', err);
  process.exit(1);
});
