<#
  Helper para restaurar processos do PM2 a partir do dump salvo (pm2 save).
  Útil para ser chamado manualmente ou por tarefa agendada.
#>



Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Garante que o PM2 está disponível no PATH (instalação global via npm)
$pm2Cmd = (Get-Command pm2 -ErrorAction SilentlyContinue)
if (-not $pm2Cmd) {
  throw 'PM2 não encontrado no PATH. Instale com: npm i -g pm2'
}

# Restaura processos salvos (dump)
pm2 resurrect
