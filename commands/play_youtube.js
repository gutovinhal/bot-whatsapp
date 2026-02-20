const fs = require('fs')
const path = require('path')

/**
 * Comando `!play`.
 *
 * Busca no YouTube e envia áudio no WhatsApp.
 * Principais pontos:
 * - tenta `@distube/ytdl-core` (fallback `ytdl-core`) para info/stream
 * - fallback com `yt-dlp` (mais resiliente), opcionalmente convertendo para MP3
 * - cache local em `data/music-cache/` para evitar downloads repetidos
 */

const yts = require('yt-search')

let ytdl
try {
  // Variante mais mantida e com fixes frequentes para mudanças do YouTube.
  ytdl = require('@distube/ytdl-core')
} catch (e) {
  ytdl = require('ytdl-core')
}
const { MessageMedia } = require('whatsapp-web.js')

// FFmpeg é usado principalmente quando o fallback (yt-dlp) precisa extrair/convertê-lo para MP3.

let ffmpegPath = null
try {
  ffmpegPath = require('ffmpeg-static')
} catch (e) {
  ffmpegPath = null
}

const YT_REQUEST_OPTIONS = {
  headers: {
    // Ajuda a evitar alguns bloqueios/variações de resposta do YouTube.
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
  }
}

/**
 * Mapeia extensão para um mimeType de áudio aceitável pelo WhatsApp.
 * @param {string} ext
 * @returns {string}
 */

// Mapeia extensão para um mimeType de áudio aceitável pelo WhatsApp.
function mimeFromExt(ext) {
  const e = String(ext || '')
    .toLowerCase()
    .replace(/^\./, '')
  if (e === 'mp3') return 'audio/mpeg'
  if (e === 'webm') return 'audio/webm'
  if (e === 'ogg' || e === 'opus') return 'audio/ogg'
  return 'audio/mp4'
}

/**
 * Reações são opcionais (dependem de suporte na versão da lib).
 * @param {any} message
 * @param {string} emoji
 */

// Reações são opcionais (dependem de suporte na versão da lib).
async function safeReact(message, emoji) {
  try {
    if (message && typeof message.react === 'function') {
      await message.react(emoji)
    }
  } catch (e) {
    // ignore
  }
}

async function reactLoading(message) {
  await safeReact(message, '⏳')
}

async function reactError(message) {
  await safeReact(message, '❌')
}

async function reactSuccess(message) {
  await safeReact(message, '🎵')
}

/**
 * Normaliza texto (queries, títulos, etc.).
 * @param {string} s
 * @returns {string}
 */

// Normaliza texto (queries, títulos, etc.).
function cleanText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Aplica clamp em valores numéricos vindos de env/config.
 * @param {any} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */

// Aplica clamp em valores numéricos vindos de env/config.
function clampNumber(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

/**
 * Garante que um diretório existe.
 * @param {string} dir
 */

// Garante que um diretório existe.
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

/**
 * Remove caracteres inválidos de nomes de arquivo (Windows-safe) e limita tamanho.
 * @param {string} name
 * @returns {string}
 */

// Remove caracteres inválidos de nomes de arquivo (Windows-safe) e limita tamanho.
function safeFileName(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function formatMB(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '0 MB'
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

// Converte mimeType para extensão.
function mimeToExt(mimeType) {
  const mt = String(mimeType || '')
    .toLowerCase()
    .split(';')[0]
    .trim()
  if (mt === 'audio/mpeg') return 'mp3'
  if (mt === 'audio/mp4') return 'm4a'
  if (mt === 'audio/webm') return 'webm'
  if (mt === 'audio/ogg') return 'ogg'
  if (mt.startsWith('audio/')) return mt.split('/')[1] || 'audio'
  return 'audio'
}

// Lê um stream inteiro para Buffer.
async function streamToBuffer(stream) {
  const chunks = []
  return await new Promise((resolve, reject) => {
    stream.on('data', c => chunks.push(c))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

// Consulta metadados do YouTube com tentativas (reduz falhas intermitentes).
async function getInfoWithRetries(url) {
  const options = {
    requestOptions: { headers: { ...YT_REQUEST_OPTIONS.headers } }
  }

  let lastError = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await ytdl.getInfo(url, options)
    } catch (e) {
      lastError = e
      // Pequeno atraso para casos intermitentes.
      await new Promise(r => setTimeout(r, 250))
    }
  }
  throw lastError
}

/**
 * Fallback: baixa usando yt-dlp (mais resiliente a mudanças do YouTube).
 * Pode converter para mp3 se `PLAY_FORCE_MP3=1`.
 *
 * @param {{ url: string, videoId: string, cacheDir: string }} params
 * @returns {Promise<string|null>} Caminho do arquivo criado (ou `null`)
 */

// Fallback: baixa usando yt-dlp (mais resiliente a mudanças do YouTube).
// Pode converter para mp3 se PLAY_FORCE_MP3=1.
async function downloadAudioWithYtDlp({ url, videoId, cacheDir }) {
  let ytDlp
  try {
    ytDlp = require('yt-dlp-exec')
  } catch (e) {
    return null
  }

  ensureDir(cacheDir)

  const outTemplate = path.join(cacheDir, `${videoId}.%(ext)s`)
  const before = new Set(fs.readdirSync(cacheDir))

  const forceMp3 = String(process.env.PLAY_FORCE_MP3 || '1').trim() !== '0'
  const ffmpegLocation = cleanText(process.env.FFMPEG_PATH) || ffmpegPath

  const debug = String(process.env.PLAY_DEBUG || '').trim() === '1'
  try {
    await ytDlp(url, {
      noPlaylist: true,
      // Ajuda o yt-dlp a passar pelo EJS do YouTube (quando necessário).
      jsRuntimes: 'node',
      format: forceMp3
        ? 'bestaudio/best'
        : 'bestaudio[ext=m4a]/bestaudio[ext=mp4]/bestaudio',
      ...(forceMp3
        ? {
            extractAudio: true,
            audioFormat: 'mp3',
            audioQuality: '0'
          }
        : {}),
      ...(ffmpegLocation ? { ffmpegLocation } : {}),
      output: outTemplate,
      noPart: true,
      forceOverwrites: true,
      ...(debug ? { verbose: true } : { quiet: true, noWarnings: true })
    })
  } catch (e) {
    try {
      const msg = (e && (e.stderr || e.message)) || String(e)
      console.warn('[play][yt-dlp] falha:', msg.split(/\r?\n/)[0])
    } catch (e2) {
      // ignore
    }
    return null
  }

  const after = fs.readdirSync(cacheDir)
  const created = after
    .filter(f => !before.has(f))
    .filter(f => f.startsWith(`${videoId}.`))

  if (created.length === 0) {
    // fallback: tenta achar qualquer arquivo gerado com o prefixo
    const any = after.filter(f => f.startsWith(`${videoId}.`))
    if (any.length === 0) return null
    created.push(...any)
  }

  // Pega o mais recente
  let newest = null
  let newestMtime = 0
  for (const f of created) {
    const p = path.join(cacheDir, f)
    try {
      const st = fs.statSync(p)
      const m = st.mtimeMs || 0
      if (m >= newestMtime) {
        newestMtime = m
        newest = p
      }
    } catch (e) {
      // ignore
    }
  }

  return newest
}

/**
 * Resolve uma query (texto) ou URL para um par { url, info } do YouTube.
 * @param {string} queryOrUrl
 * @returns {Promise<{url: string, info: any} | null>}
 */

// Resolve uma query (texto) ou URL para um par { url, info } do YouTube.
async function resolveYouTubeInfo(queryOrUrl) {
  const q = cleanText(queryOrUrl)
  if (!q) return null

  if (ytdl.validateURL(q)) {
    const info = await getInfoWithRetries(q)
    return { url: q, info }
  }

  const res = await yts(q)
  const videos = (res && res.videos) || []
  const candidates = videos.slice(0, 5).filter(v => v && v.url)
  if (candidates.length === 0) return null

  let lastError = null
  for (const v of candidates) {
    try {
      const info = await getInfoWithRetries(v.url)
      return { url: v.url, info }
    } catch (e) {
      lastError = e
    }
  }

  // Se todos falharam, propagamos o último erro para a camada de cima decidir a mensagem.
  if (lastError) throw lastError
  return null
}

// Seleciona candidatos de busca para tentativas sequenciais.
function pickCandidatesFromSearchResult(res, max = 5) {
  const videos = (res && res.videos) || []
  return videos
    .filter(v => v && v.url)
    .slice(0, max)
    .map(v => ({
      url: v.url,
      title: cleanText(v.title) || 'Áudio',
      videoId: cleanText(v.videoId) || null,
      lengthSeconds: Number(v.seconds || 0)
    }))
}

// Seleciona um formato de áudio (m4a preferido) com base nos formatos disponíveis.
async function pickAudioFormat(info) {
  const formats = (info && info.formats) || []
  const audioOnly = ytdl.filterFormats(formats, 'audioonly')
  if (!audioOnly || audioOnly.length === 0) return null

  const byMime = mime =>
    audioOnly
      .filter(f =>
        String(f.mimeType || '')
          .toLowerCase()
          .includes(mime)
      )
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))

  // Preferir m4a (audio/mp4) para tocar bem no WhatsApp.
  return (
    byMime('audio/mp4')[0] ||
    byMime('audio/mpeg')[0] ||
    byMime('audio/ogg')[0] ||
    byMime('audio/webm')[0] ||
    audioOnly.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0]
  )
}

// Comando `!play`: busca música no YouTube e envia o áudio no WhatsApp.
// Implementa cache em `data/music-cache/` e tenta fallback via yt-dlp.
module.exports = {
  name: 'play',
  description: '🎵 Busca uma música no YouTube e envia o áudio.',
  usage: '*!play* <nome da música ou url do YouTube>',

  /**
   * Handler do comando.
   * @param {{ message: any, args: string[], client: any }} ctx
   */
  async execute({ message, args, client }) {
    const query = cleanText(args.join(' '))
    if (!query) {
      return await message.reply(
        'Uso: *!play* <nome da música ou url do YouTube>'
      )
    }

    await reactLoading(message)

    const maxMinutes = clampNumber(
      process.env.PLAY_MAX_DURATION_MINUTES || 10,
      1,
      60
    )
    const maxBytes = clampNumber(
      process.env.PLAY_MAX_BYTES || 16 * 1024 * 1024,
      1,
      50 * 1024 * 1024
    )

    const forceMp3 = String(process.env.PLAY_FORCE_MP3 || '1').trim() !== '0'

    // No modo MP3, preferimos usar yt-dlp para baixar/converter.
    // Como alguns vídeos podem estar indisponíveis (UNPLAYABLE), tentamos múltiplos candidatos.
    let url = null
    let info = null
    let title = null
    let videoId = null
    let lengthSeconds = 0

    if (forceMp3 && !ytdl.validateURL(cleanText(query))) {
      let res
      try {
        res = await yts(cleanText(query))
      } catch (e) {
        res = null
      }
      const candidates = pickCandidatesFromSearchResult(res, 5)
      if (candidates.length === 0) {
        await reactError(message)
        return await message.reply('Não encontrei nenhum resultado.')
      }

      let chosen = null
      for (const c of candidates) {
        const mins = c.lengthSeconds > 0 ? c.lengthSeconds / 60 : 0
        if (mins && mins > maxMinutes) continue

        // Tentamos baixar/convertendo para MP3; se falhar (vídeo indisponível), tenta o próximo.
        const cacheDir = path.join(__dirname, '..', 'data', 'music-cache')
        ensureDir(cacheDir)
        const candidateId = c.videoId || safeFileName(c.title) || 'audio'
        const tryPath = await downloadAudioWithYtDlp({
          url: c.url,
          videoId: candidateId,
          cacheDir
        })
        if (tryPath) {
          chosen = { ...c, videoId: candidateId, filePath: tryPath }
          break
        }
      }

      if (!chosen) {
        await reactError(message)
        return await message.reply(
          'Não consegui acessar nenhum resultado do YouTube para esse termo. Tente outro termo ou envie um link direto.'
        )
      }

      url = chosen.url
      title = chosen.title
      videoId = chosen.videoId
      lengthSeconds = chosen.lengthSeconds

      // A partir daqui, seguimos com o envio a partir do arquivo já baixado.
      // Para manter o restante do código simples, vamos carregar o buffer e pular a etapa do ytdl.
      let audioBuffer = null
      try {
        const st = fs.statSync(chosen.filePath)
        if (st.size > maxBytes) {
          try {
            fs.unlinkSync(chosen.filePath)
          } catch (e2) {
            // ignore
          }
          await reactError(message)
          return await message.reply(
            `Áudio muito grande para enviar (${formatMB(
              st.size
            )}). Limite: ${formatMB(maxBytes)}.`
          )
        }
        audioBuffer = fs.readFileSync(chosen.filePath)
      } catch (e) {
        await reactError(message)
        return await message.reply(
          'Falha ao baixar/convertar para MP3. Se estiver em um servidor, instale ffmpeg ou defina FFMPEG_PATH.'
        )
      }

      const filename = `${safeFileName(title) || 'audio'}.mp3`
      const media = new MessageMedia(
        'audio/mpeg',
        audioBuffer.toString('base64'),
        filename
      )

      try {
        await client.sendMessage(message.from, media, {
          sendAudioAsVoice: false
        })
      } catch (e) {
        try {
          await client.sendMessage(message.from, media, {
            sendMediaAsDocument: true
          })
        } catch (e2) {
          await reactError(message)
          return await message.reply('Não consegui enviar o áudio no WhatsApp.')
        }
      }

      await reactSuccess(message)
      return
    }

    // Caminho normal (url direto ou não forçar mp3)
    let resolved
    try {
      resolved = await resolveYouTubeInfo(query)
    } catch (e) {
      resolved = null
    }
    if (!resolved) {
      await reactError(message)
      return await message.reply(
        'Não consegui acessar esse vídeo no YouTube. Tente outro termo ou envie um link direto.'
      )
    }

    ;({ url, info } = resolved)

    const details = (info && info.videoDetails) || {}
    title = cleanText(details.title) || 'Áudio'
    videoId = cleanText(details.videoId) || safeFileName(title) || 'audio'

    lengthSeconds = Number(details.lengthSeconds || 0)
    const minutes = lengthSeconds > 0 ? lengthSeconds / 60 : 0
    if (minutes && minutes > maxMinutes) {
      await reactError(message)
      return await message.reply(
        `Esse vídeo é muito longo (${minutes.toFixed(1)} min). Limite: ${maxMinutes} min.`
      )
    }

    const format = await pickAudioFormat(info)
    if (!format) {
      await reactError(message)
      return await message.reply(
        'Não encontrei um formato de áudio compatível para baixar.'
      )
    }

    let mimeType = forceMp3
      ? 'audio/mpeg'
      : String(format.mimeType || '')
          .split(';')[0]
          .trim() || 'audio/mp4'

    let ext = forceMp3 ? 'mp3' : mimeToExt(mimeType)

    const cacheDir = path.join(__dirname, '..', 'data', 'music-cache')
    ensureDir(cacheDir)

    const audioPath = path.join(cacheDir, `${videoId}.${ext}`)

    let audioBuffer = null
    let cachedFilePath = null
    try {
      const files = fs
        .readdirSync(cacheDir)
        .filter(f => f.startsWith(`${videoId}.`))

      if (files.length > 0) {
        let newest = null
        let newestMtime = 0
        for (const f of files) {
          const p = path.join(cacheDir, f)
          try {
            const st = fs.statSync(p)
            const m = st.mtimeMs || 0
            if (m >= newestMtime) {
              newestMtime = m
              newest = p
            }
          } catch (e) {
            // ignore
          }
        }
        if (newest) cachedFilePath = newest
      }
    } catch (e) {
      cachedFilePath = null
    }

    try {
      const p = cachedFilePath || audioPath
      if (p && fs.existsSync(p)) {
        audioBuffer = fs.readFileSync(p)
        const cachedExt = path.extname(p).replace(/^\./, '')
        if (cachedExt) {
          ext = cachedExt
          mimeType = mimeFromExt(cachedExt)
        }
      }
    } catch (e) {
      audioBuffer = null
    }

    let downloadedViaYtdl = false
    if (!audioBuffer) {
      if (forceMp3) {
        // Para garantir MP3, usamos yt-dlp (com ffmpeg) diretamente.
        try {
          const fallbackPath = await downloadAudioWithYtDlp({
            url,
            videoId,
            cacheDir
          })
          if (!fallbackPath) {
            await reactError(message)
            return await message.reply(
              'Falha ao baixar/convertar para MP3. Se estiver em um servidor, instale ffmpeg ou defina FFMPEG_PATH.'
            )
          }

          const st = fs.statSync(fallbackPath)
          if (st.size > maxBytes) {
            try {
              fs.unlinkSync(fallbackPath)
            } catch (e2) {
              // ignore
            }
            await reactError(message)
            return await message.reply(
              `Áudio muito grande para enviar (${formatMB(
                st.size
              )}). Limite: ${formatMB(maxBytes)}.`
            )
          }

          audioBuffer = fs.readFileSync(fallbackPath)
          ext = 'mp3'
          mimeType = 'audio/mpeg'
        } catch (e) {
          await reactError(message)
          return await message.reply(
            'Falha ao baixar/convertar para MP3. Se estiver em um servidor, instale ffmpeg ou defina FFMPEG_PATH.'
          )
        }
      } else {
        try {
          const stream = ytdl.downloadFromInfo(info, {
            format,
            highWaterMark: 1 << 25
          })
          audioBuffer = await streamToBuffer(stream)
          downloadedViaYtdl = true
        } catch (e) {
          // Fallback bem mais confiável quando o ytdl quebra por mudanças do YouTube.
          try {
            const fallbackPath = await downloadAudioWithYtDlp({
              url,
              videoId,
              cacheDir
            })

            if (!fallbackPath) {
              await reactError(message)
              return await message.reply('Falha ao baixar o áudio do YouTube.')
            }

            const st = fs.statSync(fallbackPath)
            if (st.size > maxBytes) {
              try {
                fs.unlinkSync(fallbackPath)
              } catch (e2) {
                // ignore
              }
              await reactError(message)
              return await message.reply(
                `Áudio muito grande para enviar (${formatMB(
                  st.size
                )}). Limite: ${formatMB(maxBytes)}.`
              )
            }

            audioBuffer = fs.readFileSync(fallbackPath)

            // Ajusta mime/ext baseado no arquivo gerado
            const fallbackExt = path.extname(fallbackPath).replace(/^\./, '')
            if (fallbackExt) {
              ext = fallbackExt
              mimeType = mimeFromExt(fallbackExt)
            }
          } catch (e2) {
            await reactError(message)
            return await message.reply('Falha ao baixar o áudio do YouTube.')
          }
        }
      }

      if (!audioBuffer || audioBuffer.length === 0) {
        await reactError(message)
        return await message.reply(
          'Não consegui baixar o áudio (arquivo vazio).'
        )
      }

      if (audioBuffer.length > maxBytes) {
        await reactError(message)
        return await message.reply(
          `Áudio muito grande para enviar (${formatMB(
            audioBuffer.length
          )}). Limite: ${formatMB(maxBytes)}.`
        )
      }

      if (downloadedViaYtdl) {
        try {
          fs.writeFileSync(audioPath, audioBuffer)
        } catch (e) {
          // cache é best-effort
        }
      }
    }

    const filename = `${safeFileName(title) || 'audio'}.${ext}`
    const media = new MessageMedia(
      mimeType,
      audioBuffer.toString('base64'),
      filename
    )

    await message.reply(`🎵 *${title}*\nEnviando áudio...`)

    try {
      await client.sendMessage(message.from, media, { sendAudioAsVoice: false })
    } catch (e) {
      try {
        await client.sendMessage(message.from, media, {
          sendMediaAsDocument: true
        })
      } catch (e2) {
        await reactError(message)
        return await message.reply('Não consegui enviar o áudio no WhatsApp.')
      }
    }

    await reactSuccess(message)
  }
}
