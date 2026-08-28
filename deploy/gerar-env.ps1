# Gera backend\.env de produção com um JWT_SECRET aleatório.
# Rode UMA vez, na máquina da loja, a partir da pasta deploy\:
#   powershell -ExecutionPolicy Bypass -File .\gerar-env.ps1

param(
  [string]$Saida = "..\backend\.env"
)
$ErrorActionPreference = "Stop"

if (Test-Path $Saida) {
  Write-Host "Ja existe $Saida — nao vou sobrescrever. Apague ou edite na mao." -ForegroundColor Yellow
  exit 1
}

# 48 bytes aleatorios -> 96 caracteres hex
$bytes = New-Object 'System.Byte[]' 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$jwt = -join ($bytes | ForEach-Object { $_.ToString('x2') })

$senhaMysql = Read-Host "Senha do MySQL (usuario root)"
$senhaAdmin = Read-Host "Senha inicial do admin do sistema (sera trocada no 1o login)"

$conteudo = @"
PORTA=3001
JWT_SECRET=$jwt
JWT_EXPIRES=12h
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=$senhaMysql
MYSQL_DATABASE=sm_panificadora
MYSQL_DATABASE_TEST=sm_panificadora_test
ADMIN_SEED_USERNAME=admin
ADMIN_SEED_PASSWORD=$senhaAdmin
CORS_ORIGIN=http://localhost:4173
"@

$conteudo | Out-File -Encoding ascii $Saida
Write-Host ""
Write-Host "Criado: $Saida" -ForegroundColor Green
Write-Host "JWT_SECRET tem $($jwt.Length) caracteres. NAO versione este arquivo (ja esta no .gitignore)." -ForegroundColor Green
