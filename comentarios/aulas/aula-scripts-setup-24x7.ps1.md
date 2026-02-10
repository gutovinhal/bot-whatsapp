# Aula — Entendendo o `scripts/setup-24x7.ps1` (PM2 + resurrect no Windows)

Este script configura o bot para rodar 24x7 no Windows.

## 1) O que ele faz

1. Garante que o `pm2` existe (instala globalmente se necessário)
2. Sobe os apps do `ecosystem.config.cjs`
3. Executa `pm2 save`
4. Cria uma tarefa agendada no logon para rodar `pm2 resurrect`
   - Se não conseguir (permissão), cria um `.cmd` na pasta Startup do usuário

## 2) Detalhes importantes

- Remove processos antigos do PM2 (`pm2 delete ...`) para evitar duplicados
- Prefere usar `pm2.cmd` (mais compatível com o Task Scheduler)

## 3) Como usar

- `npm run setup:24x7`

Depois verifique:

- `pm2 status`
- `pm2 logs --lines 200`

## 4) Pontos de atenção

- Tarefa agendada pode exigir permissões dependendo da política da máquina
- Se usar o fallback Startup, o script cria `BotWhatsApp-PM2.cmd`
