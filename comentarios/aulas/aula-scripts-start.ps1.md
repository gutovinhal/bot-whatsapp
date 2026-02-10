# Aula — Entendendo o `scripts/start.ps1` (execução manual)

Este script é um atalho para iniciar o bot manualmente no Windows.

## 1) O que ele faz

- ativa modo estrito (`Set-StrictMode -Version Latest`)
- define `$ErrorActionPreference = 'Stop'`
- vai para a raiz do projeto
- executa `node .\index.js`

## 2) Por que existe

- Evita ruídos do terminal (ex.: comportamento ao encerrar com Ctrl+C)
- Simplifica a execução para quem prefere PowerShell

## 3) Como usar

- `npm run start:ps`
- ou execute o arquivo diretamente
