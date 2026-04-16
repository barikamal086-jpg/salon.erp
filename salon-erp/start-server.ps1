# Script PowerShell para reiniciar o servidor Salon ERP facilmente
# Executa: cd salon-erp\backend && npm start

Write-Host "`n🚀 Iniciando servidor Salon ERP..." -ForegroundColor Green
Write-Host "📍 Localização: C:\Users\bari.NTMAD243\salon-erp\backend" -ForegroundColor Cyan
Write-Host "⏱️  Hora: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Cyan
Write-Host "`n"

Set-Location -Path "C:\Users\bari.NTMAD243\salon-erp\backend"

npm start

Read-Host "Pressione Enter para sair"
