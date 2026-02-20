# Aula — Entendendo o `scripts/remove-24x7.ps1` (desinstalar modo 24x7)

Este script desfaz o que o `setup-24x7.ps1` criou.

## 1) O que ele faz

- Para os apps do PM2 (`pm2 stop ...`)
- Remove os apps do PM2 (`pm2 delete ...`)
- Remove a tarefa agendada `BotWhatsApp-PM2` (se existir)
- Remove o fallback `BotWhatsApp-PM2.cmd` da pasta Startup (se existir)

## 2) Como usar

- `npm run remove:24x7`

## 3) Ponto de atenção

- Se o PM2 não estiver no PATH, o script falha
- Se a tarefa foi criada com outro nome, ajuste `$taskName`
