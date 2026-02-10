# Aula — Entendendo o `src/index.js` (Webhook Zenvia)

Este arquivo sobe um servidor webhook usando `@zenvia/sdk`.

## 1) Objetivo

- Receber eventos de mensagem do canal `whatsapp` via Zenvia
- Responder mensagens (texto e, às vezes, arquivos)
- Opcionalmente identificar músicas via Audd quando a mensagem contém áudio

## 2) Carregamento de configuração

- `dotenv.config()` carrega `.env`
- Porta vem de `ZENVIA_WEBHOOK_PORT` ou `PORT` (fallback: 3000)
- Token vem de `ZENVIA_TOKEN` (ou `ZENVIA_API_TOKEN`)

Se o token não existir, o processo encerra com `process.exit(1)`.

## 3) Integração Audd

- Se `AUDD_TOKEN` estiver ausente, o webhook avisa via `console.warn`
- `recognizeMusic(url)` chama `https://api.audd.io/` com `form-data`
- Retorna artista/título/álbum e infos do Deezer quando disponíveis

## 4) Handler principal (`messageEventHandler`)

Fluxo:

1. Loga o evento
2. Define fallback `contents = [TextContent('Testado')]`
3. Detecta se o primeiro content é um arquivo de áudio
4. Se for áudio:
   - chama Audd
   - monta resposta com artista/título/álbum
   - pode anexar imagem e preview do Deezer
5. Envia com `whatsapp.sendMessage(to, from, ...contents)`

## 5) Eventos do servidor

- `webhook.on('listening', ...)`
- `webhook.on('error', ...)`
  - trata `EADDRINUSE` com mensagem mais amigável

## 6) Variáveis de ambiente

- `ZENVIA_TOKEN` (obrigatório)
- `ZENVIA_WEBHOOK_PORT` (opcional)
- `AUDD_TOKEN` (opcional)

## 7) Pontos de atenção

- O webhook é um processo separado do bot principal (`index.js`)
- O formato de evento e content depende do SDK da Zenvia
