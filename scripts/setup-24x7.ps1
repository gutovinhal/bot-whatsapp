<#
  Setup 24x7 (Windows).
  Este script:
  1) garante que o PM2 está instalado
  2) sobe os apps definidos em `ecosystem.config.cjs`
  3) salva o estado (pm2 save)
  4) cria uma tarefa agendada no logon para rodar `pm2 resurrect`
     (com fallback para a pasta Startup do usuário)
#>



Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "[setup] Pasta do projeto: $root"

# 1) Garantir PM2
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
  Write-Host '[setup] PM2 não encontrado. Instalando globalmente...'
  npm i -g pm2
}

# 2) Subir apps via ecosystem (limpa duplicados antes)
Write-Host '[setup] Limpando processos antigos do PM2 (se existirem)...'
pm2 delete bot-whatsapp 2>$null | Out-Null
pm2 delete zenvia-webhook 2>$null | Out-Null

Write-Host '[setup] Iniciando bot + webhook via PM2...'
pm2 start ecosystem.config.cjs

Write-Host '[setup] Salvando estado do PM2 (pm2 save)...'
pm2 save

# 3) Criar tarefa agendada no logon do usuário atual
$taskName = 'BotWhatsApp-PM2'

$pm2CmdResolved = (Get-Command pm2 -ErrorAction SilentlyContinue)
if (-not $pm2CmdResolved) {
  throw 'PM2 não encontrado no PATH. Instale com: npm i -g pm2'
}

# No Windows, o comando pode resolver para pm2.ps1/pm2.cmd.
# Para o Task Scheduler, preferimos usar o .cmd (mais simples/compatível).
$pm2Bin = $pm2CmdResolved.Source
if ($pm2Bin -match '\.ps1$') {
  $candidate = [System.IO.Path]::ChangeExtension($pm2Bin, '.cmd')
  if (Test-Path $candidate) { $pm2Bin = $candidate }
}

$taskRun = "$pm2Bin resurrect"

# Remove tarefa antiga, se existir
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
  Write-Host "[setup] Removendo tarefa existente: $taskName"
  schtasks.exe /Delete /TN $taskName /F | Out-Null
}

Write-Host "[setup] Criando tarefa agendada (ONLOGON): $taskName"

# ONLOGON sem /RU costuma criar para o usuário atual sem pedir senha.
try {
  $oldErr = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  schtasks.exe /Create /F /SC ONLOGON /TN $taskName /TR $taskRun | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "schtasks falhou com exit code $LASTEXITCODE" }
  Write-Host "[setup] Tarefa criada: $taskName"
} catch {
  # Fallback: cria um .cmd na pasta Startup do usuário atual.
  Write-Warning "[setup] Não foi possível criar tarefa agendada (provável permissão/admin). Fallback: Startup do usuário."

  $startupDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
  if (-not (Test-Path $startupDir)) {
    New-Item -ItemType Directory -Force -Path $startupDir | Out-Null
  }

  $startupFile = Join-Path $startupDir 'BotWhatsApp-PM2.cmd'
  $content = "@echo off`r`n`"$pm2Bin`" resurrect`r`n"
  Set-Content -Path $startupFile -Value $content -Encoding ASCII
  Write-Host "[setup] Criado no Startup: $startupFile"
} finally {
  if ($oldErr) { $ErrorActionPreference = $oldErr }
}

Write-Host '[setup] OK. Para ver status: pm2 status'
Write-Host '[setup] Logs: pm2 logs --lines 200'
