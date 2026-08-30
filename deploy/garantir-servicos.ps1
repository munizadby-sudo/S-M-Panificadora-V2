# Garante MySQL + API (:3001) + tela (:4173) antes do Chrome.
# Chamado pelo abrir-pdv.bat. Nao pede Cursor.

$ErrorActionPreference = 'Continue'
$raiz = Split-Path $PSScriptRoot -Parent
$pm2 = @(
  'C:\npm-global\pm2.cmd',
  (Join-Path $env:APPDATA 'npm\pm2.cmd')
) | Where-Object { Test-Path $_ } | Select-Object -First 1

function PortaOuvindo([int]$porta) {
  $linhas = netstat -ano | Select-String -Pattern ":$porta\s" | Select-String 'LISTENING'
  return [bool]$linhas
}

function EsperarPorta([int]$porta, [int]$segundos) {
  for ($i = 0; $i -lt $segundos; $i++) {
    if (PortaOuvindo $porta) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

# Este PC usa o MySQL do XAMPP (porta 3306). O servico Windows MySQL80 existe
# mas esta parado de proposito — ligar os dois na mesma porta quebra o caixa.
if (-not (PortaOuvindo 3306)) {
  Write-Host 'Ligando o banco (XAMPP)...'
  $mysqld = 'C:\xampp\mysql\bin\mysqld.exe'
  $ini = 'C:\xampp\mysql\bin\my.ini'
  if (Test-Path $mysqld) {
    Start-Process -FilePath $mysqld -ArgumentList "--defaults-file=$ini","--standalone" -WorkingDirectory 'C:\xampp' -WindowStyle Hidden
    if (-not (EsperarPorta 3306 30)) {
      Write-Host 'O banco nao subiu na porta 3306.'
      exit 1
    }
  } else {
    Write-Host "mysqld nao encontrado em $mysqld"
    exit 1
  }
}

$apiOk = PortaOuvindo 3001
$webOk = PortaOuvindo 4173

if (-not $apiOk -or -not $webOk) {
  Write-Host 'Subindo a API e a tela...'
  if ($pm2) {
    $eco = Join-Path $raiz 'ecosystem.config.js'
    $descricao = & $pm2 describe pdv-api 2>$null
    if ($LASTEXITCODE -ne 0) {
      & $pm2 start $eco
    } else {
      if (-not $apiOk) { & $pm2 start pdv-api }
      if (-not $webOk) { & $pm2 start pdv-web }
    }
  } else {
    if (-not $apiOk) {
      Start-Process -FilePath 'node' -ArgumentList 'src\server.js' -WorkingDirectory (Join-Path $raiz 'backend') -WindowStyle Minimized
    }
    if (-not $webOk) {
      Start-Process -FilePath 'node' -ArgumentList 'servir.mjs' -WorkingDirectory (Join-Path $raiz 'frontend') -WindowStyle Minimized
    }
  }
}

if (-not (EsperarPorta 3001 40)) {
  Write-Host 'A API nao subiu na porta 3001.'
  exit 1
}
if (-not (EsperarPorta 4173 20)) {
  Write-Host 'A tela nao subiu na porta 4173.'
  exit 1
}

exit 0
