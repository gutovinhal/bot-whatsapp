# Aula — Entendendo o `commands/audd.js` (identificação de músicas)

O comando `!audd` identifica uma música a partir de um áudio/vídeo usando a API do **audd.io**.

## 1) Como usar

- Envie um áudio/vídeo com legenda `!audd`, ou
- Responda a uma mídia com `!audd`

## 2) Fluxo

1. Resolve a mensagem que contém mídia:
   - se `message.hasMedia`, usa a própria
   - se for reply (`hasQuotedMsg`), usa a citada

2. Valida token:
   - usa `AUDD_API_TOKEN` ou `AUDD_TOKEN`

3. Baixa a mídia:
   - `mediaMsg.downloadMedia()`
   - converte `media.data` (base64) em `Buffer`

4. Aplica limite de tamanho:
   - `AUDD_MAX_BYTES` (default ~20MB)

5. Envia para a API do Audd:
   - usa `fetch` + `FormData` (Node moderno)
   - envia `file` como Blob

6. Monta resposta:
   - artista/título/álbum
   - trecho (`timecode` → `mm:ss`)
   - links Spotify/Apple quando existirem

## 3) Helpers do arquivo

- `cleanText()`
- `formatSeconds()`
- `formatBytes()`
- `pickFirstUrl()`
- `postToAudd()` (POST com arquivo)

## 4) Variáveis de ambiente

- `AUDD_API_TOKEN` (ou `AUDD_TOKEN`) — obrigatório para funcionar
- `AUDD_MAX_BYTES` — opcional

## 5) Pontos de atenção

- API externa pode falhar (rede/rate-limit)
- Mensagens muito grandes são rejeitadas antes do upload
