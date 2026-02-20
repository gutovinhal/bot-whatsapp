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

# Instruções para adicionar este script à inicialização:
# 1. Pressione Win+R, digite shell:startup e pressione Enter.
# 2. Crie um atalho para este script (pm2-resurrect.ps1) na pasta de inicialização.
#    Exemplo de comando do atalho:
#    powershell.exe -ExecutionPolicy Bypass -File "C:\Users\augus\OneDrive\Área de Trabalho\ALL\Dev\Bot WhatsApp\scripts\pm2-resurrect.ps1"
# 3. Pronto! O bot será restaurado automaticamente ao ligar o Windows.
