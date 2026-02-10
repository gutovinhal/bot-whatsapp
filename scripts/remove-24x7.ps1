<#
  Remove o modo 24x7 (Windows).
  - Para e remove processos do PM2
  - Remove a tarefa agendada criada pelo setup
  - Remove o atalho .cmd da pasta Startup (caso tenha sido usado o fallback)
#>



Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$taskName = 'BotWhatsApp-PM2'

Write-Host '[remove] Parando apps do PM2...'
pm2 stop bot-whatsapp 2>$null | Out-Null
pm2 stop zenvia-webhook 2>$null | Out-Null

Write-Host '[remove] Removendo apps do PM2...'
pm2 delete bot-whatsapp 2>$null | Out-Null
pm2 delete zenvia-webhook 2>$null | Out-Null

Write-Host '[remove] Removendo tarefa agendada (se existir)...'
$taskExists = $false
$oldErr = $ErrorActionPreference
try {
  $ErrorActionPreference = 'SilentlyContinue'
  schtasks.exe /Query /TN $taskName 1>$null 2>$null
  $taskExists = ($LASTEXITCODE -eq 0)
} finally {
  $ErrorActionPreference = $oldErr
}

if ($taskExists) {
  schtasks.exe /Delete /TN $taskName /F | Out-Null
  Write-Host "[remove] Tarefa removida: $taskName"
} else {
  Write-Host "[remove] Tarefa não existe: $taskName"
}

try {
  # Se o setup criou um .cmd na pasta Startup, removemos aqui.
  $startupDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
  $startupFile = Join-Path $startupDir 'BotWhatsApp-PM2.cmd'
  if (Test-Path $startupFile) {
    Remove-Item -Force $startupFile
    Write-Host "[remove] Removido do Startup: $startupFile"
  }
} catch {
  # ignore
}

Write-Host '[remove] OK.'
