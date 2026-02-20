// Subcomando: foto
const { MessageMedia } = require('whatsapp-web.js')

module.exports = async function foto({
  message,
  args,
  getMediaMessage,
  sendStickerFromMedia
}) {
  // Se o usuário pedir !fig foto fundo, delega para o subcomando dedicado
  if (args && args[1] && args[1].toLowerCase() === 'fundo') {
    return require('./foto_fundo')({
      message,
      getMediaMessage,
      sendStickerFromMedia
    })
  }

  const mediaMsg = await getMediaMessage()
  if (!mediaMsg)
    return await message.reply(
      'Envie uma imagem (ou responda uma imagem) e use *!fig foto*.'
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
    // Remover fundo usando rembg (Python) e garantir máxima qualidade
    const inputBuffer = Buffer.from(media.data, 'base64')
    const { execFileSync } = require('child_process')
    const fs = require('fs')
    const os = require('os')
    const path = require('path')
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figfoto-'))
    const inputPath = path.join(tmpDir, 'input.png')
    const outputPath = path.join(tmpDir, 'output.png')
    fs.writeFileSync(inputPath, inputBuffer)
    try {
      const { spawnSync } = require('child_process')
      const rembgExe = 'C:/Dev/venv-rembg/Scripts/rembg.exe'
      const env = { ...process.env }
      env.PATH =
        'C:/Dev/venv-rembg/Scripts' + require('path').delimiter + env.PATH
      console.log(
        '[fig foto] Chamando rembg.exe',
        rembgExe,
        inputPath,
        outputPath,
        '| PATH:',
        env.PATH
      )
      const py = spawnSync(rembgExe, ['i', inputPath, outputPath], {
        encoding: 'utf8',
        timeout: 60000,
        env
      })
      console.log(
        '[fig foto] rembg status:',
        py.status,
        'error:',
        py.error,
        'stderr:',
        py.stderr,
        'stdout:',
        py.stdout
      )
      if (py.error && String(py.error).includes('ETIMEDOUT')) {
        await message.reply(
          '⏳ O processamento demorou demais (timeout). Se for a primeira vez usando o comando, aguarde o download dos modelos do rembg e tente novamente em alguns minutos.'
        )
        await sendStickerFromMedia(media)
        return
      }
      let stdout = py.stdout || ''
      let stderr = py.stderr || ''
      if (py.error || py.status !== 0) {
        let detail = ''
        if (stderr) detail += '\nSTDERR: ' + stderr.slice(0, 400)
        if (stdout) detail += '\nSTDOUT: ' + stdout.slice(0, 400)
        if (py.error) detail += '\nERROR: ' + String(py.error).slice(0, 400)
        await message.reply(
          'Não consegui remover o fundo da imagem. Erro:' +
            detail +
            '\nEnviando figurinha original.'
        )
        await sendStickerFromMedia(media)
        return
      }
      const outBuffer = fs.readFileSync(outputPath)
      // Ajusta para 1000x1000px se possível
      const { createCanvas, loadImage } = require('canvas')
      const img = await loadImage(outBuffer)
      const size = Math.max(img.width, img.height, 1000)
      const canvas = createCanvas(size, size)
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, size, size)
      const x = (size - img.width) / 2
      const y = (size - img.height) / 2
      ctx.drawImage(img, x, y)
      const finalBuffer = canvas.toBuffer('image/png')
      const newMedia = {
        mimetype: 'image/png',
        data: finalBuffer.toString('base64')
      }
      await sendStickerFromMedia(newMedia)
    } catch (e) {
      let detail = ''
      if (e.stderr) {
        detail = String(e.stderr).slice(0, 400)
      } else if (e.message) {
        detail = String(e.message).slice(0, 400)
      } else {
        detail = String(e).slice(0, 400)
      }
      await message.reply(
        'Não consegui remover o fundo da imagem. Erro: ' +
          detail +
          '\nEnviando figurinha original.'
      )
      await sendStickerFromMedia(media)
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true })
      } catch (e) {}
    }
  } catch (e) {
    await message.reply('Não consegui converter a imagem em figurinha.')
  }
}
