#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Tentar copiar frontend de múltiplos caminhos possíveis
const possiblePaths = [
  path.join(__dirname, '../frontend'),           // Local development
  path.join('/app', 'frontend'),                 // Se já estiver em /app
  path.join('/app/salon-erp', 'frontend'),       // Se estiver em /app/salon-erp
  path.join(process.cwd(), 'frontend'),          // Current working directory
  path.join(process.cwd(), '..', 'frontend'),    // Parent directory
];

const srcPath = possiblePaths.find(p => fs.existsSync(p));
const dstPath = path.join(__dirname, 'frontend');

if (srcPath && srcPath !== dstPath) {
  console.log(`[Setup] Copiando frontend de ${srcPath} para ${dstPath}`);

  const copyDir = (src, dst) => {
    if (!fs.existsSync(dst)) {
      fs.mkdirSync(dst, { recursive: true });
    }

    fs.readdirSync(src).forEach(file => {
      const srcFile = path.join(src, file);
      const dstFile = path.join(dst, file);

      if (fs.statSync(srcFile).isDirectory()) {
        copyDir(srcFile, dstFile);
      } else {
        fs.copyFileSync(srcFile, dstFile);
      }
    });
  };

  try {
    copyDir(srcPath, dstPath);
    console.log('[Setup] Frontend copiado com sucesso!');
  } catch (err) {
    console.error('[Setup] Erro ao copiar frontend:', err.message);
  }
} else if (fs.existsSync(dstPath)) {
  console.log('[Setup] Frontend já existe em', dstPath);
} else {
  console.warn('[Setup] Frontend não encontrado em nenhum dos caminhos esperados');
}
