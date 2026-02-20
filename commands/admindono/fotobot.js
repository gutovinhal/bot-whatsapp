// Subcomando: fotobot
module.exports = async function fotobot({ message, client }) {
  try {
    let mediaMsg = null
    if (message.hasMedia) mediaMsg = message
    else if (message.hasQuotedMsg) {
      const q = await message.getQuotedMessage()
      if (q && q.hasMedia) mediaMsg = q
    }
    if (!mediaMsg)
      return await message.reply(
        'Envie ou responda uma imagem com *!dono fotobot*'
      )

    const media = await mediaMsg.downloadMedia()
    if (!media || !media.data)
      return await message.reply('Não foi possível baixar a mídia.')

    const mimetype = String(media.mimetype || '').toLowerCase()
    if (!mimetype || !mimetype.startsWith('image/')) {
      return await message.reply(
        'Envie ou responda uma *imagem* (foto). Figurinhas/áudios/vídeos não servem para foto do bot.'
      )
    }

    if (mimetype === 'image/webp') {
      return await message.reply(
        'Isso parece ser uma *figurinha (WEBP)*. Para foto do bot, envie uma *foto* (JPEG/PNG) e responda ela com *!dono fotobot*.'
      )
    }

    if (client && typeof client.setProfilePicture === 'function') {
      const ok = await client.setProfilePicture(media)
      if (ok) await message.reply('Foto do bot atualizada com sucesso!')
      else
        await message.reply(
          'Não consegui atualizar a foto do bot (sem detalhes).'
        )
    } else {
      await message.reply(
        'Alteração de foto não suportada pela versão da biblioteca em uso.'
      )
    }
  } catch (e) {
    await message.reply('Erro ao alterar foto: ' + (e.message || e))
  }
}
