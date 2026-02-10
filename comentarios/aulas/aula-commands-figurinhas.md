# Aula — Entendendo o `commands/figurinhas.js` (stickers)

O comando `!figurinhas` cria e transforma figurinhas.

## 1) Subcomandos

- `foto` → imagem → figurinha
- `video` / `gif` → vídeo/GIF curto → figurinha animada
- `sticker2foto` → figurinha (webp) → imagem (png)
- `renomear` → reenviar sticker com pack/autor
- `emojimix` → (depende de implementação interna)
- `auto` → toggle de autosticker do grupo

## 2) Fluxo comum: descobrir a mídia

`getMediaMessage()` retorna:

- a mensagem atual (se tiver mídia), ou
- a mensagem citada (reply), se ela tiver mídia

## 3) Criação de figurinha (imagem/vídeo)

O `sendStickerFromMedia(media, opts)`:

- cria um `MessageMedia`
- responde com `sendMediaAsSticker: true`
- define `stickerName` e `stickerAuthor`

Para `video/gif`, a conversão depende do pipeline interno do `whatsapp-web.js` (que usa `fluent-ffmpeg`).

## 4) Conversão de sticker para foto

`sticker2foto`:

- salva o webp em temp
- usa `ffmpeg-static` via `spawnSync`
- gera `out.png`
- envia a imagem de volta

## 5) Persistência

- usa `lib/storage.js` para ler/gravar settings (ex.: `groupSettings.json`)

## 6) Pontos de atenção

- `video/gif` pode falhar por falta de `ffmpeg` no ambiente
- Tamanho/tempo do vídeo influencia muito a conversão
- No Windows/PM2, `ffmpeg` precisa ser resolvido corretamente (PATH/FFMPEG_PATH)
