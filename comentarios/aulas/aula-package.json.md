# Aula — Entendendo o `package.json` (scripts e dependências)

Este arquivo define:

- Nome/versão do projeto
- Scripts NPM (como iniciar e gerenciar PM2)
- Dependências usadas pelo bot

## 1) Scripts

Principais scripts:

- `npm start` → `node index.js`
- `npm run dev` → `node --watch index.js`
- `npm run start:zenvia` → `node src/index.js`

Scripts de Windows/PowerShell:

- `npm run start:ps` → roda `scripts/start.ps1`
- `npm run setup:24x7` → instala e configura PM2 + resurrect
- `npm run remove:24x7` → remove o modo 24x7

Scripts PM2:

- `npm run pm2:start` / `pm2:restart` / `pm2:logs` / etc.

Script de reset:

- `npm run reset` tenta encerrar processos `chrome.exe` do Puppeteer ligados ao `LocalAuth` e reinicia o bot

## 2) Dependências (o que cada uma faz)

- `whatsapp-web.js`: cliente do WhatsApp Web (Puppeteer)
- `qrcode-terminal`: mostra QR no terminal
- `dotenv`: carrega `.env`
- `axios` / `got`: HTTP
- `ffmpeg-static`: fornece `ffmpeg.exe` (útil para stickers/conversões)
- `@distube/ytdl-core`, `ytdl-core`, `yt-search`, `yt-dlp-exec`: YouTube/áudio
- `telegram`: GramJS (integração opcional Telegram)
- `@zenvia/sdk`: webhook/integração Zenvia
- `openai`, `@google/generative-ai`: integrações de IA (dependendo do uso)

## 3) Pontos de atenção

- `type: commonjs` → todo o projeto está em `require/module.exports`
- Windows: scripts usam `powershell -ExecutionPolicy Bypass` (precisa permitir execução de scripts)
