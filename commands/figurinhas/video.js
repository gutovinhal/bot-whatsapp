// Subcomando: video/gif
const { MessageMedia } = require('whatsapp-web.js')

module.exports = async function video({
  message,
  getMediaMessage,
  sendStickerFromMedia,
  ffmpegPath
}) {
  const mediaMsg = await getMediaMessage()
  if (!mediaMsg)
    return await message.reply(
      'Envie um vídeo/GIF curto (ou responda um) e use *!figurinhas video*.'
    )

  const media = await mediaMsg.downloadMedia()
  if (!media || !media.mimetype)
    return await message.reply('Não consegui baixar a mídia.')

  const mt = String(media.mimetype).toLowerCase()
  const isVideo = mt.startsWith('video/')
  const isGif = mt.includes('gif')
  if (!isVideo && !isGif)
    return await message.reply('Isso não parece ser um *vídeo/GIF*.')

  try {
    await sendStickerFromMedia(media)
  } catch (e) {
    try {
      console.error(
        '[figurinhas] erro ao converter para sticker animado:',
        e && (e.stack || e.message) ? e.stack || e.message : e
      )
    } catch (err) {}
    const detailRaw =
      (e && (e.message || (e.stack && String(e.stack).split('\n')[0]))) ||
      (e ? String(e) : '')
    const detail = String(detailRaw || '')
      .trim()
      .slice(0, 220)
    const tip = ffmpegPath
      ? ''
      : '\nDica: instale `ffmpeg` ou configure `FFMPEG_PATH`.'
    await message.reply(
      `Não consegui converter em figurinha animada. (Pode depender de ffmpeg / tamanho do arquivo)${detail ? `\nDetalhe: ${detail}` : ''}${tip}`
    )
  }
}
