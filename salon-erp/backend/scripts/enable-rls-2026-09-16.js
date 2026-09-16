// Migração: habilita Row Level Security (RLS) nas tabelas do projeto Caixa360.
//
// Contexto: o Supabase alertou que as tabelas estavam públicas (RLS desabilitado),
// o que significa que qualquer pessoa com a URL do projeto conseguiria ler/escrever
// os dados via API REST automática do Supabase (PostgREST), usando a chave anon.
//
// O backend deste app NÃO usa o client do Supabase — ele conecta direto no Postgres
// via DATABASE_URL, autenticado como o role "postgres". Esse role tem BYPASSRLS=true
// no Supabase (confirmado via pg_roles), ou seja, ele ignora RLS automaticamente e
// continua funcionando normalmente depois desta migração, sem nenhuma mudança de
// comportamento para o app.
//
// A política "postgres_full_access" abaixo é redundante na prática (o BYPASSRLS já
// garante acesso total), mas deixa a intenção explícita e documentada caso o role
// de conexão mude no futuro.
//
// Rodar uma vez: node scripts/enable-rls-2026-09-16.js

const { pool } = require('../database');

const TABELAS = [
  'faturamento',
  'tipo_despesa',
  'notas_fiscais',
  'restaurantes',
  'taxas_plataforma',
  'regras_categoria_fornecedor'
];

async function habilitarRLS() {
  console.log('🔒 Habilitando Row Level Security (RLS)...\n');

  for (const tabela of TABELAS) {
    try {
      await pool.query(`ALTER TABLE ${tabela} ENABLE ROW LEVEL SECURITY;`);
      console.log(`✅ RLS habilitado em "${tabela}"`);

      // Remove a política antiga (se existir) antes de recriar, pra migração ser idempotente
      await pool.query(`DROP POLICY IF EXISTS postgres_full_access ON ${tabela};`);
      await pool.query(`
        CREATE POLICY postgres_full_access ON ${tabela}
        FOR ALL
        TO postgres
        USING (true)
        WITH CHECK (true);
      `);
      console.log(`   ↳ Política "postgres_full_access" criada (acesso total ao role postgres)`);
    } catch (err) {
      console.error(`❌ Erro em "${tabela}":`, err.message);
    }
  }

  // Confirmação final
  const { rows } = await pool.query(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = ANY($1)
    ORDER BY tablename;
  `, [TABELAS]);

  console.log('\n📋 Status final (rowsecurity deve ser true em todas):');
  console.table(rows);

  const faltando = rows.filter(r => !r.rowsecurity);
  if (faltando.length > 0) {
    console.error('\n⚠️  Alguma tabela ficou sem RLS:', faltando.map(r => r.tablename));
    process.exitCode = 1;
  } else {
    console.log('\n✅ RLS habilitado com sucesso em todas as tabelas.');
  }

  await pool.end();
}

habilitarRLS().catch(err => {
  console.error('❌ Erro fatal na migração:', err);
  process.exit(1);
});
