// Subcomando: renomear
module.exports = async function renomear({
  message,
  args,
  getMediaMessage,
  parseRenameText,
  sendStickerFromMedia
}) {
  const mediaMsg = await getMediaMessage()
  if (!mediaMsg)
    return await message.reply(
      'Responda uma imagem/vídeo/figurinha e use *!figurinhas renomear* <nome>|<autor>.'
    )

  const { name, author } = parseRenameText(args.slice(1).join(' '))
  if (!name || !author)
    return await message.reply(
      'Uso: *!figurinhas renomear* <nome>|<autor> (responda a mídia)'
    )

  const media = await mediaMsg.downloadMedia()
  if (!media || !media.mimetype)
    return await message.reply('Não consegui baixar a mídia.')

  try {
    await sendStickerFromMedia(media, { name, author })
  } catch (e) {
    await message.reply('Não consegui reenviar como figurinha renomeada.')
  }
}
