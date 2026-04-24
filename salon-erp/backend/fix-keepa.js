const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'salon-erp.db');
const db = new sqlite3.Database(dbPath);

db.run("UPDATE faturamento SET categoria = 'Keeta' WHERE categoria = 'Keepa'", (err) => {
  if (err) {
    console.error('Erro:', err);
    process.exit(1);
  }

  db.get("SELECT COUNT(*) as count FROM faturamento WHERE categoria = 'Keeta'", (err, row) => {
    if (err) {
      console.error('Erro:', err);
    } else {
      console.log(`✅ Atualizado! ${row.count} registros com 'Keeta'`);
    }

    db.close();
    process.exit(0);
  });
});
