// Subcomando: sticker2foto
const { MessageMedia } = require('whatsapp-web.js')
const fs = require('fs')
const os = require('os')
const path = require('path')

module.exports = async function sticker2foto({
  message,
  getMediaMessage,
  runFfmpeg,
  ffmpegPath
}) {
  const mediaMsg = await getMediaMessage()
  if (!mediaMsg)
    return await message.reply(
      'Responda uma figurinha e use *!figurinhas sticker2foto*.'
    )

  const media = await mediaMsg.downloadMedia()
  if (!media || !media.mimetype)
    return await message.reply('Não consegui baixar a mídia.')

  const mt = String(media.mimetype).toLowerCase()
  if (!mt.includes('webp'))
    return await message.reply('Isso não parece ser uma *figurinha (webp)*.')

  if (!ffmpegPath)
    return await message.reply(
      'Não tenho `ffmpeg` disponível para converter figurinha em foto.'
    )

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wwebjs-sticker-'))
  const inPath = path.join(tmpDir, 'in.webp')
  const outPath = path.join(tmpDir, 'out.png')

  try {
    fs.writeFileSync(inPath, Buffer.from(media.data, 'base64'))
    const r = runFfmpeg(['-y', '-i', inPath, outPath])
    if (!r.ok) {
      return await message.reply(
        'Falha ao converter figurinha em imagem: ' + r.error
      )
    }
    const png = fs.readFileSync(outPath)
    const mm = new MessageMedia('image/png', png.toString('base64'))
    await message.reply(mm)
  } catch (e) {
    await message.reply('Não consegui converter a figurinha em imagem.')
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (e) {}
  }
}
