# Aula — Entendendo o `commands/play_youtube.js` (buscar e enviar áudio do YouTube)

Este arquivo implementa o comando `!play` para:

- buscar no YouTube
- baixar o áudio
- enviar o áudio no WhatsApp

## 1) Dependências usadas

- `yt-search` (`yts`) → busca por termo
- `@distube/ytdl-core` (fallback `ytdl-core`) → obtém info e baixa stream
- `yt-dlp-exec` → fallback mais resiliente quando o ytdl quebra
- `ffmpeg-static` → fornece `ffmpeg.exe` para conversão (principalmente quando força MP3)

## 2) Estratégias de download

O arquivo usa duas estratégias:

1. `ytdl-core` / `@distube/ytdl-core`
   - pega info (`getInfoWithRetries`)
   - baixa stream (`downloadFromInfo`)

2. Fallback `yt-dlp`
   - usado quando:
     - `PLAY_FORCE_MP3=1`, ou
     - o `ytdl` falha por mudanças do YouTube
   - pode chamar ffmpeg para extrair MP3

## 3) Cache

O comando usa cache local em `data/music-cache/` (conforme implementação no arquivo):

- salva/recupera downloads para evitar baixar repetidamente

## 4) Limites e validações

- Limite de tamanho por envio (configurável)
- Sanitização de nome de arquivo para Windows (`safeFileName`)
- Helpers de formatação (`formatMB`, etc.)

## 5) Reações (UX)

O arquivo tenta reagir na mensagem com:

- ⏳ (carregando)
- ❌ (erro)
- 🎵 (sucesso)

Isso é “best-effort” (depende do suporte da versão da lib).

## 6) Variáveis de ambiente

- `PLAY_FORCE_MP3` (default ligado no arquivo)
- `FFMPEG_PATH` (para yt-dlp/ffmpeg)
- `PLAY_DEBUG` (verbo/quiet do yt-dlp)

## 7) Pontos de atenção

- O YouTube muda com frequência: fallback yt-dlp é importante
- FFmpeg é essencial quando precisa converter para MP3
- Envio de áudio no WhatsApp pode falhar dependendo do mimeType/tamanho; o código tenta fallback para documento
