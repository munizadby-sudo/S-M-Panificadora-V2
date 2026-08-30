# Restaura um .sql para um banco de TESTE (nao mexe no de producao).
#   powershell -ExecutionPolicy Bypass -File .\restaurar.ps1 -Arquivo C:\PDV-backups\sm_AAAAMMDD_HHMM.sql -SenhaMysql "SUA_SENHA"
# Desastre real (loja fechada): -Database sm_panificadora

param(
  [Parameter(Mandatory = $true)][string]$Arquivo,
  [string]$Database = "sm_panificadora_scratch",
  [string]$MysqlUser = "root",
  [string]$SenhaMysql = "",
  [string]$MysqlExe = ""
)
$ErrorActionPreference = "Stop"

if (-not $MysqlExe) {
  $padrao = "C:\xampp\mysql\bin\mysql.exe"
  if (Test-Path $padrao) { $MysqlExe = $padrao } else { $MysqlExe = "mysql" }
}

if (-not (Test-Path $Arquivo)) { throw "Arquivo nao encontrado: $Arquivo" }
if ($SenhaMysql) { $env:MYSQL_PWD = $SenhaMysql }
if (-not $env:MYSQL_PWD) { throw "Sem senha: passe -SenhaMysql ou defina MYSQL_PWD." }

Write-Host "Recriando banco $Database ..." -ForegroundColor Cyan
& $MysqlExe --user=$MysqlUser -e "DROP DATABASE IF EXISTS ``$Database``; CREATE DATABASE ``$Database`` CHARACTER SET utf8mb4;"
if ($LASTEXITCODE -ne 0) { throw "falha ao recriar o banco" }

Write-Host "Importando $Arquivo ..." -ForegroundColor Cyan
cmd /c "`"$MysqlExe`" --user=$MysqlUser $Database < `"$Arquivo`""
if ($LASTEXITCODE -ne 0) { throw "falha ao importar o dump" }

$tabelas = (& $MysqlExe --user=$MysqlUser $Database -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$Database';")
Write-Host ""
Write-Host "OK — $Database restaurado com $tabelas tabelas." -ForegroundColor Green

Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
