// Helpers e dependências
const { MessageMedia } = require('whatsapp-web.js')
const { readJSON, writeJSON } = require('../lib/storage')
const ffmpegPath = require('ffmpeg-static')
const { spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

/**
 * Comando `!fig`.
 *
 * Cria/transforma stickers.
 * Subcomandos típicos:
 * - `foto` / `video` / `gif`
 * - `sticker2foto`
 * - `renomear`
 * - `auto` (toggle de autosticker via `groupSettings.json`)
 *
 * Responsabilidades:
 * - Converter mídia em figurinha
 * - Converter figurinha em imagem
 * - Renomear figurinha
 * - Ativar/desativar autosticker no grupo
 *
 * Helpers internos no topo, handler principal abaixo.
 */

/**
 * Comando `!fig`.
 *
 * Cria/transforma stickers.
 * Subcomandos típicos:
 * - `foto` / `video` / `gif`
 * - `sticker2foto`
 * - `renomear`
 * - `auto` (toggle de autosticker via `groupSettings.json`)
 */

// Comando `!fig`: cria/transforma stickers.
// Suporta:
// - foto/video/gif -> figurinha
// - sticker2foto -> figurinha (webp) para imagem
// - renomear -> reenviar com pack/autor
// - auto -> toggle de autosticker no grupo (persistido em groupSettings.json)
module.exports = {
  name: 'fig',
  description:
    '🖼️✨ Comandos relacionados a figurinhas e stickers. Subcomandos: foto, video, gif, sticker2foto, renomear, emojimix, auto.',
  usage: '*!fig* <subcomando> [args]',
  // --- Helpers internos ---
  // getMediaMessage: retorna a mensagem com mídia (própria ou citada)
  // parseRenameText: parseia texto "nome|autor"
  // sendStickerFromMedia: envia mídia como figurinha
  // runFfmpeg: executa ffmpeg
  //
  // Handler principal abaixo (switch/case para subcomandos)

  /**
   * Handler do comando.
   * @param {{ message: any, args: string[], client: any }} ctx
   */
  async execute({ message, args, client }) {
    const cmd = (args[0] || '').toLowerCase()

    // Helpers compartilhados
    async function getMediaMessage() {
      if (message.hasMedia) return message
      if (message.hasQuotedMsg) {
        const q = await message.getQuotedMessage()
        if (q && q.hasMedia) return q
      }
      return null
    }
    function parseRenameText(raw) {
      const s = String(raw || '').trim()
      if (!s) return { name: null, author: null }
      const parts = s.split('|')
      const name = String(parts[0] || '').trim() || null
      const author = String(parts[1] || '').trim() || null
      return { name, author }
    }
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

    // Importação dinâmica dos subcomandos
    const subcommands = {
      foto: require('./figurinhas/foto'),
      video: require('./figurinhas/video'),
      gif: require('./figurinhas/video'),
      sticker2foto: require('./figurinhas/sticker2foto'),
      renomear: require('./figurinhas/renomear'),
      emojimix: require('./figurinhas/emojimix'),
      auto: require('./figurinhas/auto'),
      'foto fundo': require('./figurinhas/foto_fundo')
    }

    if (!cmd) {
      // ...existing code...
      const entries = [
        {
          title: '🖼️ *Foto*',
          desc: 'Converte foto em figurinha.',
          usage: 'envie foto e responda com *!fig foto*'
        },
        {
          title: '🎞️ *Video / GIF*',
          desc: 'Converte vídeo ou GIF curto em figurinha animada.',
          usage: 'envie vídeo/GIF e responda com *!fig video*'
        },
        {
          title: '🔄🖼️ *Sticker2Foto*',
          desc: 'Converte figurinha em imagem.',
          usage: 'responda sticker com *!fig sticker2foto*'
        },
        {
          title: '✏️ *Renomear*',
          desc: 'Altera pack/autor da figurinha.',
          usage: '*!fig renomear* <nome>|<autor> (responda sticker)'
        },
        {
          title: '😊➕😎 *EmojiMix*',
          desc: 'Mistura emojis em stickers.',
          usage: '*!fig emojimix* <emoji1> <emoji2>'
        },
        {
          title: '🤖 *Auto*',
          desc: 'Ativa/desativa criação automática de stickers ao enviar mídia.',
          usage: '*!fig auto* on|off (ou use *!admin autosticker*)'
        }
      ]
      const validEntries = entries.filter(
        e => e && e.title && e.desc && e.usage
      )
      const header = [
        '*🖼️✨ Figurinhas*',
        'Use: *!fig* <subcomando> (envie/responda mídia quando necessário)'
      ]
      const blocks = validEntries.map(e =>
        [`${e.title}`, `• ${e.desc}`, `• Uso: ${e.usage}`].join('\n')
      )
      const footer =
        '_Obs:_ conversões de vídeo/GIF podem precisar de `ffmpeg` instalado no servidor.'
      await message.reply(
        [...header, '', ...blocks, footer].join('\n\n').trim()
      )
      return
    }

    // Executa subcomando se existir
    // Suporte para !fig foto fundo
    const cmdKey = args
      .slice(0, 2)
      .map(s => (s || '').toLowerCase())
      .join(' ')
      .trim()
    if (subcommands[cmdKey]) {
      await subcommands[cmdKey]({
        message,
        args,
        client,
        getMediaMessage,
        parseRenameText,
        sendStickerFromMedia,
        runFfmpeg,
        ffmpegPath
      })
      return
    }
    if (subcommands[cmd]) {
      await subcommands[cmd]({
        message,
        args,
        client,
        getMediaMessage,
        parseRenameText,
        sendStickerFromMedia,
        runFfmpeg,
        ffmpegPath
      })
      return
    }

    // Subcomando não reconhecido
    await message.reply(
      '❌ Comando não reconhecido.\nUse: *!fig* <foto|video|gif|sticker2foto|renomear|emojimix|auto>'
    )
  }
}
