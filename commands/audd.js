const { Blob } = require('buffer')

/**
 * Comando `!audd`.
 *
 * Identifica músicas a partir de um áudio/vídeo do WhatsApp via API do audd.io.
 * Depende de `AUDD_API_TOKEN` (ou `AUDD_TOKEN`) no `.env`.
 */

// Sanitiza texto para logs/mensagens.
function cleanText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Formata duração em segundos para mm:ss.
function formatSeconds(seconds) {
  const n = Number(seconds)
  if (!Number.isFinite(n) || n <= 0) return null
  const m = Math.floor(n / 60)
  const s = Math.floor(n % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Formata bytes para B/KB/MB/GB (mensagem amigável ao usuário).
function formatBytes(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let u = 0
  let v = n
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024
    u += 1
  }
  const fixed = u === 0 ? 0 : 2
  return `${v.toFixed(fixed)} ${units[u]}`
}

// Tenta achar o primeiro link útil em objetos retornados pela API (Spotify/Apple, etc.).
function pickFirstUrl(obj) {
  if (!obj) return null
  const candidates = [
    obj.url,
    obj.song_link,
    obj.link,
    obj.external_urls && obj.external_urls.spotify
  ]
  for (const c of candidates) {
    const s = cleanText(c)
    if (s) return s
  }
  return null
}

// Faz POST para a API do audd.io enviando um arquivo (buffer) com FormData.
// Observação: este código depende de `fetch` e `FormData` globais (Node 18+).
async function postToAudd({ token, buffer, mimeType, fileName }) {
  if (!token) {
    const err = new Error('AUDD_API_TOKEN ausente')
    err.code = 'NO_TOKEN'
    throw err
  }

  // Node 18+ expõe FormData global (undici). No Node 24 isso é garantido.
  if (typeof FormData === 'undefined' || typeof fetch === 'undefined') {
    const err = new Error('Ambiente sem fetch/FormData')
    err.code = 'NO_FETCH'
    throw err
  }

  const form = new FormData()
  form.append('api_token', token)
  form.append('return', 'spotify,apple_music')
  form.append(
    'file',
    new Blob([buffer], { type: mimeType || 'application/octet-stream' }),
    fileName || 'audio'
  )

  const r = await fetch('https://api.audd.io/', {
    method: 'POST',
    body: form
  })

  const text = await r.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch (e) {
    const err = new Error('Resposta inválida do AUDD')
    err.code = 'BAD_JSON'
    err.raw = text
    throw err
  }

  return json
}

// Comando `!audd`: identifica músicas a partir de um áudio/vídeo do WhatsApp.
module.exports = {
  name: 'audd',
  description: '🎧 Identifica uma música a partir de um áudio/vídeo.',
  usage: '*!audd* (enviar junto com mídia ou responder a uma mídia)',

  /**
   * Handler do comando.
   * @param {{ message: any }} ctx
   */
  async execute({ message }) {
    // 1) Descobrir a mídia: mensagem atual ou mensagem citada.
    let mediaMsg = null
    try {
      if (message.hasMedia) mediaMsg = message
      else if (message.hasQuotedMsg) {
        const q = await message.getQuotedMessage()
        if (q && q.hasMedia) mediaMsg = q
      }
    } catch (e) {
      mediaMsg = null
    }

    if (!mediaMsg) {
      return await message.reply(
        'Envie um áudio/vídeo com *!audd* ou responda a um áudio/vídeo com *!audd*.'
      )
    }

    const token = cleanText(
      process.env.AUDD_API_TOKEN || process.env.AUDD_TOKEN
    )
    if (!token) {
      return await message.reply(
        'Configure a variável *AUDD_API_TOKEN* (ou *AUDD_TOKEN*) no arquivo .env para usar este comando.'
      )
    }

    // 2) Baixar mídia do WhatsApp.
    let media = null
    try {
      media = await mediaMsg.downloadMedia()
    } catch (e) {
      media = null
    }

    if (!media || !media.data) {
      return await message.reply('Não foi possível baixar a mídia do WhatsApp.')
    }

    const mimeType = cleanText(media.mimetype)
    const buffer = Buffer.from(media.data, 'base64')

    const maxBytes = Number(process.env.AUDD_MAX_BYTES || 20 * 1024 * 1024)
    if (Number.isFinite(maxBytes) && maxBytes > 0 && buffer.length > maxBytes) {
      return await message.reply(
        `Mídia muito grande para identificar (${formatBytes(
          buffer.length
        )}). Limite: ${formatBytes(maxBytes)}.`
      )
    }

    // AUDD aceita vários tipos; avisamos se não parece áudio/vídeo.
    const looksOk = /^audio\//i.test(mimeType) || /^video\//i.test(mimeType)
    if (!looksOk) {
      await message.reply(
        'Aviso: isso não parece ser um áudio/vídeo. Vou tentar identificar mesmo assim.'
      )
    }

    await message.reply('⏳ Identificando com AUDD...')

    // 3) Chamar AUDD e montar resposta ao usuário.
    try {
      const fileName = (() => {
        try {
          const ext =
            mimeType && mimeType.includes('/') ? mimeType.split('/')[1] : ''
          return ext ? `clip.${ext}` : 'clip'
        } catch (e) {
          return 'clip'
        }
      })()

      const res = await postToAudd({ token, buffer, mimeType, fileName })

      if (!res || res.status !== 'success' || !res.result) {
        const errMsg = cleanText(res && res.error && res.error.error_message)
        return await message.reply(
          errMsg
            ? `Não consegui identificar. Motivo: ${errMsg}`
            : 'Não consegui identificar essa música.'
        )
      }

      const r = res.result
      const title = cleanText(r.title)
      const artist = cleanText(r.artist)
      const album = cleanText(r.album)
      const timecode = formatSeconds(r.timecode)

      const spotifyUrl = pickFirstUrl(r.spotify)
      const appleUrl = pickFirstUrl(r.apple_music)
      const songLink = cleanText(r.song_link)

      const lines = []
      lines.push('*🎧 Música identificada*')
      lines.push(
        `• ${[artist, title].filter(Boolean).join(' — ') || 'Sem título'}`
      )
      if (album) lines.push(`• Álbum: ${album}`)
      if (timecode) lines.push(`• Trecho: ${timecode}`)
      if (spotifyUrl) lines.push(`• Spotify: ${spotifyUrl}`)
      if (appleUrl) lines.push(`• Apple Music: ${appleUrl}`)
      if (songLink && !spotifyUrl && !appleUrl)
        lines.push(`• Link: ${songLink}`)

      return await message.reply(lines.join('\n'))
    } catch (e) {
      if (e && e.code === 'NO_TOKEN') {
        return await message.reply(
          'Configure a variável *AUDD_API_TOKEN* no .env para usar o AUDD.'
        )
      }
      return await message.reply(
        'Erro ao identificar com AUDD. Tente novamente.'
      )
    }
  }
}
