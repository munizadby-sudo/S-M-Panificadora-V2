# Backup do banco do PDV.
#   powershell -ExecutionPolicy Bypass -File .\backup.ps1 -SenhaMysql "SUA_SENHA" -DestinoSecundario "G:\Backups\PDV"
#
# Task Scheduler: defina MYSQL_PWD na tarefa em vez de passar -SenhaMysql.

param(
  [string]$Database = "sm_panificadora",
  [string]$MysqlUser = "root",
  [string]$SenhaMysql = "",
  [string]$Destino = "C:\PDV-backups",
  [string]$DestinoSecundario = "",
  [int]$Reter = 30,
  [string]$MysqldumpExe = ""
)
$ErrorActionPreference = "Stop"

if (-not $MysqldumpExe) {
  $padrao = "C:\xampp\mysql\bin\mysqldump.exe"
  if (Test-Path $padrao) { $MysqldumpExe = $padrao } else { $MysqldumpExe = "mysqldump" }
}

if ($SenhaMysql) { $env:MYSQL_PWD = $SenhaMysql }
if (-not $env:MYSQL_PWD) { throw "Sem senha: passe -SenhaMysql ou defina MYSQL_PWD." }

New-Item -ItemType Directory -Force -Path $Destino | Out-Null
$carimbo = Get-Date -Format "yyyyMMdd_HHmm"
$arquivo = Join-Path $Destino "sm_$carimbo.sql"

& $MysqldumpExe --user=$MysqlUser --single-transaction --routines --events --result-file=$arquivo $Database
if ($LASTEXITCODE -ne 0) { throw "mysqldump falhou (codigo $LASTEXITCODE)" }

$mb = [math]::Round((Get-Item $arquivo).Length / 1MB, 2)
Write-Host "OK  $arquivo  ($mb MB)" -ForegroundColor Green

if ($DestinoSecundario) {
  New-Item -ItemType Directory -Force -Path $DestinoSecundario | Out-Null
  Copy-Item $arquivo $DestinoSecundario -Force
  Write-Host "OK  copia em $DestinoSecundario" -ForegroundColor Green
}

Get-ChildItem $Destino -Filter "sm_*.sql" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip $Reter |
  ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "removido antigo: $($_.Name)" }

Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
