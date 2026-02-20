// Subcomando: foto fundo (mantém o fundo, máxima qualidade)
const { MessageMedia } = require('whatsapp-web.js')

module.exports = async function fotoFundo({
  message,
  getMediaMessage,
  sendStickerFromMedia
}) {
  const mediaMsg = await getMediaMessage()
  if (!mediaMsg)
    return await message.reply(
      'Envie uma imagem (ou responda uma imagem) e use *!fig foto fundo*.'
    )

  const media = await mediaMsg.downloadMedia()
  if (!media || !media.mimetype)
    return await message.reply('Não consegui baixar a mídia.')

  if (!String(media.mimetype).toLowerCase().startsWith('image/'))
    return await message.reply('Isso não parece ser uma *imagem*.')

  if (String(media.mimetype).toLowerCase().includes('webp'))
    return await message.reply(
      'Isso já parece ser uma figurinha. Use *!fig renomear* para reenviar com pack/autor.'
    )

  try {
    // Envia como figurinha PNG, máxima qualidade
    const inputBuffer = Buffer.from(media.data, 'base64')
    const { createCanvas, loadImage } = require('canvas')
    const img = await loadImage(inputBuffer)
    // WhatsApp recomenda 512x512px, mas aceita até 1000x1000px
    const size = Math.max(img.width, img.height, 512)
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    // Centraliza a imagem
    const x = (size - img.width) / 2
    const y = (size - img.height) / 2
    ctx.drawImage(img, x, y)
    const outBuffer = canvas.toBuffer('image/png')
    const newMedia = {
      mimetype: 'image/png',
      data: outBuffer.toString('base64')
    }
    await sendStickerFromMedia(newMedia)
  } catch (e) {
    await message.reply(
      'Não consegui converter a imagem em figurinha de alta qualidade.'
    )
  }
}
