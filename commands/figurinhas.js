const { MessageMedia } = require('whatsapp-web.js')
const { readJSON, writeJSON } = require('../lib/storage')
const ffmpegPath = require('ffmpeg-static')
const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

/**
 * Comando `!figurinhas`.
 *
 * Cria/transforma stickers.
 * Subcomandos típicos:
 * - `foto` / `video` / `gif`
 * - `sticker2foto`
 * - `renomear`
 * - `auto` (toggle de autosticker via `groupSettings.json`)
 */

// Comando `!figurinhas`: cria/transforma stickers.
// Suporta:
// - foto/video/gif -> figurinha
// - sticker2foto -> figurinha (webp) para imagem
// - renomear -> reenviar com pack/autor
// - auto -> toggle de autosticker no grupo (persistido em groupSettings.json)
module.exports = {
  name: 'figurinhas',
  description: '🖼️✨ Comandos relacionados a figurinhas e stickers.',
  usage: '*!figurinhas* <foto|video|gif|sticker2foto|renomear|emojimix|auto>',

  /**
   * Handler do comando.
   * @param {{ message: any, args: string[], client: any }} ctx
   */
  async execute({ message, args, client }) {
    const cmd = (args[0] || '').toLowerCase()

    // Retorna a mensagem com mídia: a própria mensagem ou a citada (reply).
    async function getMediaMessage() {
      if (message.hasMedia) return message
      if (message.hasQuotedMsg) {
        const q = await message.getQuotedMessage()
        if (q && q.hasMedia) return q
      }
      return null
    }

    // Parseia o texto no formato "nome|autor".
    function parseRenameText(raw) {
      const s = String(raw || '').trim()
      if (!s) return { name: null, author: null }
      const parts = s.split('|')
      const name = String(parts[0] || '').trim() || null
      const author = String(parts[1] || '').trim() || null
      return { name, author }
    }

    // Envia uma mídia como figurinha usando os metadados de pack/autor.
    async function sendStickerFromMedia(media, opts = {}) {
      const pack =
        String(opts.name || process.env.STICKER_PACK || 'Bot').trim() || 'Bot'
      const author =
        String(opts.author || process.env.STICKER_AUTHOR || 'Sticker').trim() ||
        'Sticker'

      const mm = new MessageMedia(media.mimetype, media.data)
      await message.reply(mm, undefined, {
        sendMediaAsSticker: true,
        stickerName: pack,
        stickerAuthor: author
      })
    }

    // Executa ffmpeg com argumentos e retorna um resultado simplificado.
    function runFfmpeg(args) {
      if (!ffmpegPath) return { ok: false, error: 'ffmpeg não encontrado.' }
      const r = spawnSync(ffmpegPath, args, { encoding: 'utf8' })
      if (r.error)
        return { ok: false, error: String(r.error.message || r.error) }
      if (r.status !== 0) {
        return {
          ok: false,
          error: (r.stderr || r.stdout || 'ffmpeg falhou')
            .toString()
            .slice(0, 500)
        }
      }
      return { ok: true }
    }

    if (!cmd) {
      const entries = [
        {
          title: '🖼️ *Foto*',
          desc: 'Converte foto em figurinha.',
          usage: 'envie foto e responda com *!figurinhas foto*'
        },
        {
          title: '🎞️ *Video / GIF*',
          desc: 'Converte vídeo ou GIF curto em figurinha animada.',
          usage: 'envie vídeo/GIF e responda com *!figurinhas video*'
        },
        {
          title: '🔄🖼️ *Sticker2Foto*',
          desc: 'Converte figurinha em imagem.',
          usage: 'responda sticker com *!figurinhas sticker2foto*'
        },
        {
          title: '✏️ *Renomear*',
          desc: 'Altera pack/autor da figurinha.',
          usage: '*!figurinhas renomear* <nome>|<autor> (responda sticker)'
        },
        {
          title: '😊➕😎 *EmojiMix*',
          desc: 'Mistura emojis em stickers.',
          usage: '*!figurinhas emojimix* <emoji1> <emoji2>'
        },
        {
          title: '🤖 *Auto*',
          desc: 'Ativa/desativa criação automática de stickers ao enviar mídia.',
          usage: '*!figurinhas auto* on|off (ou use *!admin autosticker*)'
        }
      ]

      const validEntries = entries.filter(
        e => e && e.title && e.desc && e.usage
      )

      const header = [
        '*🖼️✨ Figurinhas*',
        'Use: *!figurinhas* <subcomando> (envie/responda mídia quando necessário)'
      ]
      const blocks = validEntries.map(e => {
        return [`${e.title}`, `• ${e.desc}`, `• Uso: ${e.usage}`].join('\n')
      })
      const footer =
        '_Obs:_ conversões de vídeo/GIF podem precisar de `ffmpeg` instalado no servidor.'

      // Espaço entre opções: um bloco por entrada, separado por linha em branco.
      await message.reply(
        [...header, '', ...blocks, footer].join('\n\n').trim()
      )
      return
    }
    switch (cmd) {
      case 'foto': {
        const mediaMsg = await getMediaMessage()
        if (!mediaMsg)
          return await message.reply(
            'Envie uma imagem (ou responda uma imagem) e use *!figurinhas foto*.'
          )

        const media = await mediaMsg.downloadMedia()
        if (!media || !media.mimetype)
          return await message.reply('Não consegui baixar a mídia.')

        if (!String(media.mimetype).toLowerCase().startsWith('image/'))
          return await message.reply('Isso não parece ser uma *imagem*.')

        if (String(media.mimetype).toLowerCase().includes('webp'))
          return await message.reply(
            'Isso já parece ser uma figurinha. Use *!figurinhas renomear* para reenviar com pack/autor.'
          )

        try {
          await sendStickerFromMedia(media)
        } catch (e) {
          await message.reply('Não consegui converter a imagem em figurinha.')
        }
        break
      }
      case 'video':
      case 'gif': {
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
          } catch (err) {
            // ignore
          }

          const detailRaw =
            (e && (e.message || (e.stack && String(e.stack).split('\n')[0]))) ||
            (e ? String(e) : '')
          const detail = String(detailRaw || '')
            .trim()
            .slice(0, 220)
          const tip =
            process.env.FFMPEG_PATH || ffmpegPath
              ? ''
              : '\nDica: instale `ffmpeg` ou configure `FFMPEG_PATH`.'

          await message.reply(
            `Não consegui converter em figurinha animada. (Pode depender de ffmpeg / tamanho do arquivo)${detail ? `\nDetalhe: ${detail}` : ''}${tip}`
          )
        }
        break
      }
      case 'sticker2foto': {
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
          return await message.reply(
            'Isso não parece ser uma *figurinha (webp)*.'
          )

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

        break
      }
      case 'renomear': {
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
        break
      }
      case 'emojimix':
        await message.reply(
          'EmojiMix está em standby no momento (não há um provider estável configurado).'
        )
        break
      case 'auto': {
        const sub = (args[1] || '').toLowerCase()
        const chat = await message.getChat()
        const chatId = message.from || message.author || ''

        const settings = readJSON('groupSettings.json') || {}
        settings[chatId] = settings[chatId] || {}

        // Em grupo, exige admin; no privado, libera.
        if (chat && chat.isGroup) {
          let isAdmin = false
          try {
            const contact = await message.getContact()
            const senderId =
              (contact && contact.id && contact.id._serialized) ||
              message.author ||
              null
            const admins = (chat.participants || [])
              .filter(p => p && (p.isAdmin || p.isSuperAdmin))
              .map(p => p && p.id && p.id._serialized)
              .filter(Boolean)
            if (senderId && admins.includes(senderId)) isAdmin = true
          } catch (e) {
            isAdmin = false
          }
          if (!isAdmin)
            return await message.reply(
              'Apenas administradores podem ativar/desativar AutoSticker no grupo. Use *!admin autosticker on|off*.'
            )
        }

        const curEnabled =
          settings[chatId].autosticker &&
          settings[chatId].autosticker.enabled === true

        if (sub === 'on') {
          settings[chatId].autosticker = { enabled: true }
          writeJSON('groupSettings.json', settings)
          return await message.reply('✅ AutoSticker ativado.')
        }
        if (sub === 'off') {
          settings[chatId].autosticker = { enabled: false }
          writeJSON('groupSettings.json', settings)
          return await message.reply('✅ AutoSticker desativado.')
        }

        return await message.reply(
          `AutoSticker: *${curEnabled ? 'Ativado' : 'Desativado'}*\nUse *!figurinhas auto on* ou *!figurinhas auto off* (ou *!admin autosticker*)`
        )
      }
      default:
        await message.reply(
          '❌ Comando não reconhecido.\nUse: *!figurinhas* <foto|video|gif|sticker2foto|renomear|emojimix|auto>'
        )
    }
  }
}
