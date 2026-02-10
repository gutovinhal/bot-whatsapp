# Aula — Entendendo o `ecosystem.config.cjs` (PM2)

Este arquivo configura os processos gerenciados pelo **PM2**.

## 1) O que ele define

Ele exporta um objeto com `apps: []`, onde cada item descreve um processo.

No seu projeto existem dois processos:

- `bot-whatsapp` → roda `index.js` (bot do whatsapp-web.js)
- `zenvia-webhook` → roda `src/index.js` (webhook da Zenvia)

## 2) Campos mais importantes

- `name`: nome do app no PM2 (usado em `pm2 logs <name>`)
- `script`: arquivo de entrada
- `cwd`: diretório base
- `autorestart`, `restart_delay`, `max_restarts`: política de restart
- `watch`: hot reload (aqui está `false`)
- `env` / `env_debug`: variáveis por ambiente
- `out_file` / `error_file` / `merge_logs`: logs em `data/logs/`

## 3) Como usar

Comandos comuns:

- `pm2 start ecosystem.config.cjs`
- `pm2 status`
- `pm2 logs bot-whatsapp --lines 200`
- `pm2 restart bot-whatsapp --update-env`

## 4) Ponto de atenção

No Windows, o ambiente do PM2 pode diferir do terminal. Quando você depende de binários (ex.: `ffmpeg`), é comum precisar:

- setar variáveis no `env` do PM2
- reiniciar com `--update-env`
