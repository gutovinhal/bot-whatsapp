<#
	Script de execução manual (Windows).
	- Define modo estrito para pegar erros cedo.
	- Posiciona o terminal na raiz do projeto.
	- Inicia o bot diretamente via `node index.js`.

	Motivação: evitar ruídos/artefatos do terminal (ex.: taskkill) quando o processo
	é encerrado com Ctrl+C.
#>



Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Executa o bot diretamente (sem npm) para evitar mensagens do taskkill ao Ctrl+C.
& node .\index.js
exit $LASTEXITCODE
