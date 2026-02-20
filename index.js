// Entry-point do bot (whatsapp-web.js).
// Responsabilidades principais:
// - inicializar o cliente do WhatsApp e autenticação local
// - carregar e executar comandos (pasta commands/)
// - persistir estatísticas (data/stats.json), configurações e mutes
// - aplicar recursos automáticos por grupo (autosticker, mutargrupo, auto-kick)
// - enviar mensagem de boas-vindas e aplicar blacklist (autoban)

const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
require('dotenv').config()

// Configura ffmpeg para recursos que dependem do fluent-ffmpeg (ex.: stickers animados no whatsapp-web.js).
// No Windows, depender do ffmpeg no PATH costuma falhar; usamos ffmpeg-static como fallback.
;(function configureFfmpeg() {
  try {
    let ffmpegLocation = String(process.env.FFMPEG_PATH || '').trim()

    if (!ffmpegLocation) {
      try {
        ffmpegLocation = require('ffmpeg-static')
      } catch (e) {
        ffmpegLocation = ''
      }
    }

    if (!ffmpegLocation) return
    if (!fs.existsSync(ffmpegLocation)) return

    process.env.FFMPEG_PATH = ffmpegLocation

    // No Windows/PM2, o erro ENOENT frequentemente é PATH/Path inconsistente.
    // Prepend do diretório do ffmpeg.exe no ambiente do processo.
    const ffmpegDir = path.dirname(ffmpegLocation)
    const pathKey =
      Object.keys(process.env).find(k => k.toLowerCase() === 'path') || 'Path'
    const currentPath = String(process.env[pathKey] || '')
    if (!currentPath.toLowerCase().includes(ffmpegDir.toLowerCase())) {
      process.env[pathKey] = `${ffmpegDir};${currentPath}`
    }

    // Garante que o fluent-ffmpeg do projeto e o do whatsapp-web.js apontem pro mesmo binário.
    try {
      const ffmpeg = require('fluent-ffmpeg')
      if (ffmpeg && typeof ffmpeg.setFfmpegPath === 'function') {
        ffmpeg.setFfmpegPath(ffmpegLocation)
      }
    } catch (e) {
      // ignore
    }

    try {
      const WWebJSUtil = require('whatsapp-web.js/src/util/Util')
      if (WWebJSUtil && typeof WWebJSUtil.setFfmpegPath === 'function') {
        WWebJSUtil.setFfmpegPath(ffmpegLocation)
      }
    } catch (e) {
      // ignore
    }

    if (String(process.env.DEBUG_FFMPEG || '').trim() === '1') {
      console.log('[ffmpeg] usando:', ffmpegLocation)
      console.log('[ffmpeg] pathKey:', pathKey)
    }
  } catch (e) {
    // ignore
  }
})()

const { Client, LocalAuth } = require('whatsapp-web.js')

// Evita poluir a raiz do projeto com arquivos do tipo "<timestamp>-player-script.js"
// gerados pelo @distube/ytdl-core quando precisa salvar debug.
// Estratégia:
// - define YTDL_DEBUG_PATH para `data/ytdl-debug`
// - move arquivos antigos da raiz para esse diretório
;(function configureYtdlDebugFolder() {
  try {
    const debugDir = path.join(__dirname, 'data', 'ytdl-debug')
    if (!process.env.YTDL_DEBUG_PATH) {
      process.env.YTDL_DEBUG_PATH = debugDir
    }
    fs.mkdirSync(process.env.YTDL_DEBUG_PATH, { recursive: true })

    // Move arquivos já gerados anteriormente na raiz para a pasta de debug.
    const entries = fs.readdirSync(__dirname)
    for (const name of entries) {
      if (!/^\d+-player-script\.js$/i.test(name)) continue
      const from = path.join(__dirname, name)
      const to = path.join(process.env.YTDL_DEBUG_PATH, name)
      try {
        fs.renameSync(from, to)
      } catch (e) {
        try {
          fs.copyFileSync(from, to)
          fs.unlinkSync(from)
        } catch (e2) {
          // ignore
        }
      }
    }
  } catch (e) {
    // ignore
  }
})()

const qrcode = require('qrcode-terminal')
const { ensureDataDir, readJSON, writeJSON } = require('./lib/storage')
const RateLimiter = require('./lib/rateLimiter')

// No Windows, quando o Chrome/Puppeteer é encerrado, o terminal pode "poluir"
// o log com mensagens do taskkill (PID terminated). Esse wrapper filtra linhas
// consideradas ruído.
function installWindowsTaskkillNoiseFilter() {
  try {
    if (process.platform !== 'win32') return
    // Permite desativar caso queira ver o log cru.
    if (String(process.env.SUPPRESS_TASKKILL_ERRORS || '').trim() === '0')
      return

    const patterns = [
      /^ERRO:\s+o\s+processo\s+com\s+PID\s+\d+.*finalizado\.?\s*$/i,
      /^ERROR:\s+The\s+process\s+with\s+PID\s+\d+.*terminated\.?\s*$/i,
      /^Reason:\s+.*$/i
    ]

    const wrapWrite = originalWrite => {
      let buffer = ''
      return function (chunk, encoding, cb) {
        try {
          buffer += Buffer.isBuffer(chunk)
            ? chunk.toString('utf8')
            : String(chunk)

          const parts = buffer.split(/\r\n|\n|\r/)
          buffer = parts.pop() || ''

          const kept = []
          for (const line of parts) {
            const trimmed = String(line || '').trim()
            const isNoise = patterns.some(p => p.test(trimmed))
            if (!isNoise) kept.push(line)
          }

          if (kept.length > 0) {
            return originalWrite.call(
              this,
              kept.join('\n') + '\n',
              encoding,
              cb
            )
          }
          if (typeof cb === 'function') cb()
          return true
        } catch (e) {
          return originalWrite.call(this, chunk, encoding, cb)
        }
      }
    }

    process.stderr.write = wrapWrite(process.stderr.write)
    process.stdout.write = wrapWrite(process.stdout.write)
  } catch (e) {
    // ignore
  }
}

const client = new Client({ authStrategy: new LocalAuth() })

installWindowsTaskkillNoiseFilter()

const LOCK_PATH = path.join(__dirname, '.bot.lock')

// Evita rodar mais de uma instância do bot ao mesmo tempo.
// Implementação: cria um arquivo lock com o PID; se existir e o PID ainda estiver vivo,
// encerra o processo atual.
function ensureSingleInstance() {
  try {
    if (fs.existsSync(LOCK_PATH)) {
      const raw = fs.readFileSync(LOCK_PATH, 'utf8')
      const data = JSON.parse(raw || '{}')
      const pid = Number(data && data.pid)
      if (pid && Number.isFinite(pid)) {
        try {
          process.kill(pid, 0)
          console.error(
            `Já existe uma instância do bot rodando (pid ${pid}). Feche a anterior antes de iniciar outra.`
          )
          process.exit(1)
        } catch (e) {
          // PID não existe mais -> lock stale
        }
      }
    }

    fs.writeFileSync(
      LOCK_PATH,
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })
    )
  } catch (e) {
    // se não conseguir criar lock, segue (não deve impedir o bot)
  }
}

// Remove o arquivo de lock na finalização.
function cleanupLock() {
  try {
    if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH)
  } catch (e) {
    // ignore
  }
}

// Best-effort: encerra processos do Chrome (Puppeteer) associados a esta sessão.
// Útil em cenários em que o processo do Node cai e o Chrome fica pendurado.
// Ativação: AUTO_KILL_PUPPETEER=1 (somente Windows).
function tryAutoKillPuppeteerSession() {
  try {
    if (process.platform !== 'win32') return
    if (String(process.env.AUTO_KILL_PUPPETEER || '').trim() !== '1') return

    const sessionDir = path.join(__dirname, '.wwebjs_auth', 'session')
    const escapedSession = sessionDir.replace(/\\/g, '\\\\')

    const ps = `
$procs = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq 'chrome.exe' -and
  $_.CommandLine -match '\\\\.cache\\\\puppeteer\\\\chrome' -and
  $_.CommandLine -match '${escapedSession.replace(/'/g, "''")}'
}
if ($procs) { Stop-Process -Id $procs.ProcessId -Force -ErrorAction SilentlyContinue }
`

    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps],
      { stdio: 'ignore' }
    )
  } catch (e) {
    // ignore
  }
}

let shuttingDown = false

// Promise-based sleep.
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Rotina de shutdown "gentil":
// - evita exit imediato (principalmente no Windows)
// - tenta destruir o cliente e fechar browser/page
// - remove lock
async function shutdown(reason, exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  // Evita sair do processo imediatamente; no Windows isso pode deixar
  // processos filhos (Chrome do Puppeteer) pendurados e o terminal tenta
  // forçar um taskkill, gerando mensagens de PID.
  try {
    process.exitCode = exitCode
  } catch (e) {
    // ignore
  }

  const forceExitTimer = setTimeout(() => {
    try {
      process.exit(exitCode)
    } catch (e) {
      // ignore
    }
  }, 8000)
  try {
    if (typeof forceExitTimer.unref === 'function') forceExitTimer.unref()
  } catch (e) {
    // ignore
  }

  try {
    const r = reason || 'signal'
    const isSignal = r === 'SIGINT' || r === 'SIGTERM'
    const logSignals =
      String(process.env.LOG_SHUTDOWN_SIGNALS || '').trim() === '1'

    // Por padrão, não polui o terminal quando o usuário encerra com Ctrl+C.
    // Mantém log para erros (uncaughtException/unhandledRejection) e permite
    // reativar logs de sinais via LOG_SHUTDOWN_SIGNALS=1.
    if (!isSignal || logSignals) {
      console.log(
        '[shutdown]',
        r,
        r === 'SIGINT'
          ? '(Ctrl+C ou terminal encerrou o processo)'
          : r === 'SIGTERM'
            ? '(processo finalizado pelo sistema/terminal)'
            : ''
      )
    }
  } catch (e) {
    // ignore
  }
  try {
    // Em algumas versões, client.destroy() nem sempre fecha o Chrome rápido.
    // Tentamos fechar explicitamente o browser/page se estiverem disponíveis.
    await Promise.race([
      (async () => {
        try {
          await client.destroy()
        } catch (e) {
          // ignore
        }
        try {
          if (
            client &&
            client.pupPage &&
            typeof client.pupPage.close === 'function'
          ) {
            await client.pupPage.close()
          }
        } catch (e) {
          // ignore
        }
        try {
          if (
            client &&
            client.pupBrowser &&
            typeof client.pupBrowser.close === 'function'
          ) {
            await client.pupBrowser.close()
          }
        } catch (e) {
          // ignore
        }
      })(),
      delay(6500)
    ])
  } catch (e) {
    // ignore
  }
  cleanupLock()
  try {
    clearTimeout(forceExitTimer)
  } catch (e) {
    // ignore
  }
}

// Hooks globais para desligamento e erros não tratados.
process.on('SIGINT', () => shutdown('SIGINT', 0))
process.on('SIGTERM', () => shutdown('SIGTERM', 0))
process.on('uncaughtException', err => {
  try {
    console.error('uncaughtException:', err)
  } catch (e) {
    // ignore
  }
  shutdown('uncaughtException', 1)
})
process.on('unhandledRejection', err => {
  try {
    console.error('unhandledRejection:', err)
  } catch (e) {
    // ignore
  }
  shutdown('unhandledRejection', 1)
})

ensureSingleInstance()
tryAutoKillPuppeteerSession()

// Integração opcional com LLM local via Ollama.
// Usado por alguns comandos para gerar respostas.
const OLLAMA_API =
  process.env.OLLAMA_API || 'http://localhost:11434/api/generate'

// Envia um prompt ao modelo do Ollama e retorna o texto.
const sendToLLM = async prompt => {
  try {
    const response = await axios.post(
      OLLAMA_API,
      {
        model: 'mistral',
        prompt: prompt,
        stream: false
      },
      { timeout: 60000 }
    )
    return response.data.response
  } catch (error) {
    console.error('Erro ao conectar com Ollama:', error.message)
    return 'Desculpe, não consegui processar sua mensagem. Verifique se o Ollama está rodando.'
  }
}

// Garante `data/` e JSONs base.
ensureDataDir()

// Normaliza um id de usuário/participant para formato telefônico (+55...).
// Esse formato é usado como chave em stats/mutes/blacklist, quando possível.
function normalizeUserId(id) {
  if (!id) return id
  const local = id.split('@')[0]
  // já com '+'
  if (local.startsWith('+')) return local
  // somente dígitos -> prefixa '+'
  if (/^\d+$/.test(local)) return `+${local}`
  // senão retorna original (sem domínio)
  return local
}

// Converte um identificador "cru" (às vezes só dígitos) para o formato de participantId.
// Importante: preserva IDs com domínio (ex.: @lid) para não quebrar contas recentes.
function toDigitsParticipantId(rawId) {
  const s = String(rawId || '').trim()
  if (!s) return null
  // Preserve IDs que já vêm com domínio/sufixo (ex.: @c.us, @s.whatsapp.net, @lid)
  // Converter cegamente quebra IDs do tipo @lid.
  if (s.includes('@')) return s
  const digits = s.replace(/\D/g, '')
  return digits ? `${digits}@c.us` : null
}

// Extrai apenas dígitos de um valor.
function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '')
}

// Constrói a chave canônica do stats/blacklist no formato +<digits>.
function phoneKeyFromId(id) {
  // retorna chave de stats no formato +<digits> (quando possível)
  const d = digitsOnly(String(id || '').split('@')[0])
  return d ? `+${d}` : null
}

// Converte valores (ISO string / Date.parse) em epoch ms.
function parseTime(value) {
  if (!value) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const t = Date.parse(String(value))
  return Number.isNaN(t) ? null : t
}

// Heurística para encontrar a melhor chave existente para um participante
// comparando sufixos (ex.: variações com/sem DDD/9).
function findBestKeyForDigits(candidateKeys, participantDigits) {
  if (!participantDigits) return null
  const direct = `+${participantDigits}`
  if (candidateKeys.has(direct)) return direct
  const suf = participantDigits.slice(-9)
  for (const k of candidateKeys) {
    const kd = digitsOnly(k)
    if (!kd) continue
    if (kd.endsWith(suf) || participantDigits.endsWith(kd.slice(-9))) return k
  }
  return null
}

// Migra/normaliza dados existentes em stats.json (se houver).
// Objetivo: consolidar chaves duplicadas para o padrão +<digits>.
try {
  const statsPath = 'stats.json'
  const raw = readJSON(statsPath) || {}
  const migrated = {}
  for (const chatId of Object.keys(raw)) {
    const entry = raw[chatId]
    if (!entry || typeof entry !== 'object') continue

    // Preserve estrutura original e normalize apenas as chaves conhecidas.
    const out = { ...entry }

    const users = entry.users || {}
    const newUsers = {}
    for (const uid of Object.keys(users)) {
      const norm = normalizeUserId(uid)
      newUsers[norm] = (newUsers[norm] || 0) + users[uid]
    }
    const lasts = entry.lasts || {}
    const newLasts = {}
    for (const uid of Object.keys(lasts)) {
      const norm = normalizeUserId(uid)
      newLasts[norm] = lasts[uid]
    }

    const joins = entry.joins || {}
    const newJoins = {}
    for (const uid of Object.keys(joins)) {
      const norm = normalizeUserId(uid)
      // Em joins não somamos; apenas preservamos o timestamp mais recente.
      // Se vier duplicado por normalização, mantemos o maior (mais novo).
      const a = parseTime(newJoins[norm])
      const b = parseTime(joins[uid])
      if (!a || (b && b > a)) newJoins[norm] = joins[uid]
    }

    const baselines = entry.baselines || {}
    const newBaselines = {}
    for (const uid of Object.keys(baselines)) {
      const norm = normalizeUserId(uid)
      const v = Number(baselines[uid])
      if (!Number.isFinite(v) || v < 0) continue
      const cur = Number(newBaselines[norm])
      newBaselines[norm] = Number.isFinite(cur) ? Math.max(cur, v) : v
    }

    out.total = entry.total || 0
    out.users = newUsers
    out.lasts = newLasts
    out.joins = newJoins
    out.baselines = newBaselines

    migrated[chatId] = out
  }
  writeJSON(statsPath, migrated)
} catch (e) {
  console.error('Erro ao migrar stats.json:', e)
}

// Carrega comandos dinamicamente a partir de `commands/*.js`.
// Cada comando precisa exportar `{ name, execute(...) }` para ser registrado.
const commands = new Map()
const commandsDir = path.join(__dirname, 'commands')
if (fs.existsSync(commandsDir)) {
  for (const file of fs.readdirSync(commandsDir)) {
    if (file.endsWith('.js')) {
      try {
        const cmd = require(path.join(commandsDir, file))
        if (cmd && cmd.name) commands.set(cmd.name, cmd)
      } catch (e) {
        console.error('Erro ao carregar comando', file, e.message)
      }
    }
  }
}

// Limita quantos comandos cada usuário pode disparar por intervalo.
const limiter = new RateLimiter({ tokens: 5, interval: 60 * 1000 }) // 5 cmds per minute

client.on('ready', () => console.log('Client is ready!'))

// Expulsão automática de inativos (48h) — ativável por grupo via settings
const AUTO_KICK_DEFAULT_HOURS = 48
const AUTO_KICK_ALIGN_MINUTES = Math.max(
  1,
  Number(process.env.AUTO_KICK_ALIGN_MINUTES || 5)
)
const AUTO_KICK_INTERVAL_MINUTES_RAW = Number(
  process.env.AUTO_KICK_INTERVAL_MINUTES || 30
)
const AUTO_KICK_INTERVAL_MINUTES = Math.max(
  AUTO_KICK_ALIGN_MINUTES,
  Math.ceil(
    (Number.isFinite(AUTO_KICK_INTERVAL_MINUTES_RAW)
      ? AUTO_KICK_INTERVAL_MINUTES_RAW
      : 30) / AUTO_KICK_ALIGN_MINUTES
  ) * AUTO_KICK_ALIGN_MINUTES
)
const AUTO_KICK_DAILY_HOUR = Number(process.env.AUTO_KICK_DAILY_HOUR || 20)
const AUTO_KICK_DAILY_MINUTE_RAW = Number(
  process.env.AUTO_KICK_DAILY_MINUTE || 0
)
const AUTO_KICK_DAILY_MINUTE = Math.min(
  59,
  Math.max(
    0,
    Math.floor(
      (Number.isFinite(AUTO_KICK_DAILY_MINUTE_RAW)
        ? AUTO_KICK_DAILY_MINUTE_RAW
        : 0) / AUTO_KICK_ALIGN_MINUTES
    ) * AUTO_KICK_ALIGN_MINUTES
  )
)
const AUTO_KICK_DAILY_WINDOW_MINUTES = Math.max(
  1,
  Number(process.env.AUTO_KICK_DAILY_WINDOW_MINUTES || 2)
)
let autoKickRunning = false

function normalizeIntervalMinutes(value) {
  const step = AUTO_KICK_ALIGN_MINUTES
  const n = Number(value)
  const safe = Number.isFinite(n) && n > 0 ? n : AUTO_KICK_INTERVAL_MINUTES
  return Math.max(step, Math.ceil(safe / step) * step)
}

function getNextAlignedDelayMinutes(intervalMinutes, nowMs) {
  const safeMinutes = normalizeIntervalMinutes(intervalMinutes)
  const intervalMs = safeMinutes * 60 * 1000
  const next = Math.ceil((nowMs + 1) / intervalMs) * intervalMs
  return Math.max(0, next - nowMs)
}

function getNextDailyDelayMs(nowMs) {
  const now = new Date(nowMs)
  const target = new Date(now)
  target.setHours(AUTO_KICK_DAILY_HOUR, AUTO_KICK_DAILY_MINUTE, 0, 0)

  if (target.getTime() <= nowMs) {
    target.setDate(target.getDate() + 1)
  }

  return Math.max(0, target.getTime() - nowMs)
}

function isWithinDailyKickWindow(nowMs) {
  const now = new Date(nowMs)
  const target = new Date(now)
  target.setHours(AUTO_KICK_DAILY_HOUR, AUTO_KICK_DAILY_MINUTE, 0, 0)

  const diff = nowMs - target.getTime()
  const windowMs = AUTO_KICK_DAILY_WINDOW_MINUTES * 60 * 1000
  return diff >= 0 && diff <= windowMs
}

// Expulsa automaticamente participantes inativos de grupos com a feature ativada.
// Critério: última atividade (última msg ou join) <= cutoff.
async function runAutoKickInactive() {
  if (autoKickRunning) return
  autoKickRunning = true
  try {
    const nowMs = Date.now()
    const settings = readJSON('groupSettings.json') || {}
    const stats = readJSON('stats.json') || {}

    const autoKickDebug =
      String(process.env.AUTO_KICK_DEBUG || '').trim() === '1'
    const autoKickLog = (...parts) => {
      if (!autoKickDebug) return
      try {
        console.log('[autoKick]', ...parts)
      } catch (e) {
        // ignore
      }
    }

    // Cache por execução para não estourar chamadas repetidas
    const contactDigitsCache = new Map()

    // Resolve dígitos reais via contato, útil quando o participante vem como @lid.
    async function getDigitsFromContactId(id) {
      const key = String(id || '')
      if (!key) return null
      if (contactDigitsCache.has(key)) return contactDigitsCache.get(key)
      let digits = null
      try {
        if (client && typeof client.getContactById === 'function') {
          const c = await client.getContactById(key)
          digits =
            digitsOnly((c && c.number) || '') ||
            digitsOnly((c && c.id && c.id.user) || '') ||
            null
        }
      } catch (e) {
        digits = null
      }
      contactDigitsCache.set(key, digits)
      return digits
    }

    const enabledChatIds = Object.keys(settings).filter(chatId => {
      const cfg = settings[chatId]
      return cfg && cfg.expulsarauto && cfg.expulsarauto.enabled === true
    })

    for (const chatId of enabledChatIds) {
      try {
        const chat = await client.getChatById(chatId)
        if (!chat || !chat.isGroup) continue

        const cfg = settings[chatId] && settings[chatId].expulsarauto
        const minutes = cfg && Number(cfg.minutes)
        const hours = cfg && Number(cfg.hours)
        const hasMinutes = Number.isFinite(minutes) && minutes > 0
        const hasHours = Number.isFinite(hours) && hours > 0

        if (!hasMinutes && !isWithinDailyKickWindow(nowMs)) {
          autoKickLog(chatId, 'skip not daily window')
          continue
        }

        let durationMs = AUTO_KICK_DEFAULT_HOURS * 60 * 60 * 1000
        if (hasMinutes) {
          durationMs = minutes * 60 * 1000
        } else if (hasHours) {
          durationMs = hours * 60 * 60 * 1000
        }

        const cutoff = Date.now() - durationMs

        const entry = stats[chatId] || {}
        const lasts = entry.lasts || {}
        const joins = entry.joins || {}
        const candidateKeys = new Set([
          ...Object.keys(lasts),
          ...Object.keys(joins)
        ])

        const participants = chat.participants || []
        if (participants.length === 0) continue

        const botId =
          (client &&
            client.info &&
            client.info.wid &&
            client.info.wid._serialized) ||
          (client &&
            client.info &&
            client.info.me &&
            client.info.me._serialized) ||
          null

        const toRemove = []
        for (const p of participants) {
          if (!p || p.isAdmin || p.isSuperAdmin) {
            if (p && (p.isAdmin || p.isSuperAdmin)) {
              autoKickLog(chatId, 'skip admin', p.id && p.id._serialized)
            }
            continue
          }

          const pid = p && p.id && (p.id._serialized || p.id.user)
          const serialized =
            (p && p.id && p.id._serialized) ||
            (typeof pid === 'string' ? pid : null)
          if (!serialized) continue
          if (botId && serialized === botId) {
            autoKickLog(chatId, 'skip bot', serialized)
            continue
          }

          const pDigits = digitsOnly(
            (p && p.id && p.id.user) || String(serialized).split('@')[0]
          )

          // Se for @lid (ou qualquer id sem dígitos), tenta resolver via contato.
          const resolvedDigits =
            pDigits || (await getDigitsFromContactId(serialized))
          const key = findBestKeyForDigits(candidateKeys, resolvedDigits)
          if (!key) {
            // Sem histórico/join conhecido -> não expulsa automaticamente
            autoKickLog(chatId, 'skip no history', serialized)
            continue
          }

          const lastMsgAt = parseTime(lasts[key])
          const joinAt = parseTime(joins[key])
          const lastActivity = Math.max(lastMsgAt || 0, joinAt || 0)
          if (!lastActivity) {
            autoKickLog(chatId, 'skip no activity', serialized, key)
            continue
          }

          if (lastActivity <= cutoff) {
            toRemove.push(serialized)
          } else {
            autoKickLog(chatId, 'skip recent', serialized, key)
          }
        }

        if (toRemove.length === 0) {
          autoKickLog(chatId, 'no removals')
          continue
        }

        // Remover em lotes pequenos para evitar falhas/rate-limit
        const batchSize = 3
        for (let i = 0; i < toRemove.length; i += batchSize) {
          const batch = toRemove.slice(i, i + batchSize)
          try {
            await chat.removeParticipants(batch)
            await delay(1200)
            autoKickLog(chatId, 'removed batch', batch.length)
          } catch (e) {
            // Se falhar, tenta individual para descobrir se é um caso pontual
            for (const one of batch) {
              try {
                await chat.removeParticipants([one])
                await delay(900)
                autoKickLog(chatId, 'removed one', one)
              } catch (e2) {
                // ignore
              }
            }
          }
        }
      } catch (e) {
        // ignore per-group failures
      }
    }
  } catch (e) {
    // ignore
  } finally {
    autoKickRunning = false
  }
}

client.on('ready', () => {
  // Scheduler em grade fixa: alinha no relogio (minutos) e em horario diario.
  const loop = async () => {
    try {
      await runAutoKickInactive()
    } catch (e) {
      // ignore
    }

    const nowMs = Date.now()
    let nextDelayMs = AUTO_KICK_INTERVAL_MINUTES * 60 * 1000
    try {
      const settings = readJSON('groupSettings.json') || {}
      let minLimitMinutes = null
      let hasHoursGroups = false
      for (const chatId of Object.keys(settings)) {
        const cfg = settings[chatId] && settings[chatId].expulsarauto
        if (!cfg || cfg.enabled !== true) continue

        const m = Number(cfg.minutes)
        const h = Number(cfg.hours)
        const hasMinutes = Number.isFinite(m) && m > 0
        const hasHours = Number.isFinite(h) && h > 0

        if (hasMinutes) {
          if (minLimitMinutes == null || m < minLimitMinutes) {
            minLimitMinutes = m
          }
        } else {
          hasHoursGroups = true
        }
      }

      const delays = []
      if (minLimitMinutes != null) {
        delays.push(getNextAlignedDelayMinutes(minLimitMinutes, nowMs))
      }
      if (hasHoursGroups) {
        delays.push(getNextDailyDelayMs(nowMs))
      }

      if (delays.length > 0) {
        nextDelayMs = Math.min(...delays)
      }
    } catch (e) {
      // ignore
    }

    setTimeout(loop, nextDelayMs)
  }

  // primeira execução imediata
  loop().catch(() => {})
})

client.on('qr', qr => qrcode.generate(qr, { small: true }))

// Handler principal de mensagens (roteamento de comandos + automações).
client.on('message_create', async message => {
  try {
    // LOG DETALHADO DE DIAGNÓSTICO
    console.log('[DEBUG] Mensagem recebida:', {
      from: message.from,
      author: message.author,
      body: message.body,
      hasMedia: message.hasMedia,
      fromMe: message.fromMe,
      timestamp: message.timestamp
    })
    // Ignorar mensagens enviadas pelo próprio cliente para evitar duplicação
    if (message.fromMe) return

    let chat = null

    // tentar obter contato para extrair número real
    let contact
    try {
      contact = await message.getContact()
    } catch (e) {
      contact = null
    }

    // --- BLOQUEIO DE ÁUDIOS DE NÃO-ADMINS OU DO PEDRO ---
    const groupSettings = readJSON('groupSettings.json') || {}
    const chatId = message.from || message.author || ''
    const settings =
      groupSettings[chatId] && groupSettings[chatId].bloquearAudio
    const isGroup = chat && chat.isGroup
    const isAudio = message.hasMedia && message.type === 'audio'
    // Lista de números do Pedro (adicione quantos quiser, formato +<código><ddd><número>)
    const pedroNumbers = ['+553191091313']

    async function isAdminUser(chat, contact) {
      if (!chat || !chat.participants || !contact) return false
      const senderId = contact.id && (contact.id._serialized || contact.id.user)
      const admin = chat.participants.find(
        p => (p.id && (p.id._serialized || p.id.user)) === senderId
      )
      return !!(admin && (admin.isAdmin || admin.isSuperAdmin))
    }

    if (
      isGroup &&
      isAudio &&
      settings &&
      (settings.enabled || settings.somentePedro)
    ) {
      const isAdmin = await isAdminUser(chat, contact)
      const senderNumber =
        contact && contact.number ? `+${contact.number.replace(/\D/g, '')}` : ''
      const bloquearPedro =
        settings.somentePedro && pedroNumbers.some(num => num === senderNumber)

      if ((!isAdmin && settings.enabled) || bloquearPedro) {
        try {
          await message.delete(true) // true = para todos
          // Opcional: envie um aviso ao usuário
          // await message.reply('Áudio bloqueado para você neste grupo.');
        } catch (e) {
          // ignore
        }
        return // Não processa mais nada para áudios bloqueados
      }
    }
    // --- FIM BLOQUEIO DE ÁUDIOS ---

    // Atualiza contagem de mensagens por chat (persistente em data/stats.json)
    // Guarda também timestamp da última mensagem por usuário.
    try {
      const stats = readJSON('stats.json') || {}
      const chatId = message.from || message.author || 'private'
      // Preferir o número real (contact.number) quando disponível.
      // Em contas recentes, contact.id.user pode ser um id interno (@lid) e não o telefone.
      const contactPhoneDigits = digitsOnly((contact && contact.number) || '')
      const contactUserDigits = digitsOnly(
        (contact && contact.id && contact.id.user) || ''
      )

      const senderRaw = message.author || message.from || 'unknown'
      const senderFallback = normalizeUserId(senderRaw)

      // chave preferida: +<telefone>; fallback: +<contact.id.user> (se vier numérico); senão normalizeUserId
      const preferredSender = contactPhoneDigits
        ? `+${contactPhoneDigits}`
        : contactUserDigits
          ? `+${contactUserDigits}`
          : senderFallback

      const legacySender =
        !contactPhoneDigits && contactUserDigits
          ? `+${contactUserDigits}`
          : null

      // garantir estrutura: { [chatId]: { total: n, users: { [sender]: n }, lasts: { [sender]: iso } } }
      if (!stats[chatId] || typeof stats[chatId] !== 'object') {
        stats[chatId] = {
          total: 0,
          users: {},
          lasts: {},
          joins: {},
          baselines: {}
        }
      }
      stats[chatId].users = stats[chatId].users || {}
      stats[chatId].lasts = stats[chatId].lasts || {}
      stats[chatId].joins = stats[chatId].joins || {}
      stats[chatId].baselines = stats[chatId].baselines || {}

      // Migração “lazy”: se já houver contagem salva em uma chave legada (ex.: +<lid>),
      // e agora conseguimos o telefone real, consolidar na chave +<telefone>.
      if (contactPhoneDigits && contactUserDigits) {
        const phoneKey = `+${contactPhoneDigits}`
        const userKey = `+${contactUserDigits}`
        if (phoneKey !== userKey && stats[chatId].users[userKey]) {
          // users
          stats[chatId].users[phoneKey] =
            (stats[chatId].users[phoneKey] || 0) +
            (stats[chatId].users[userKey] || 0)
          delete stats[chatId].users[userKey]

          // lasts (manter a mais recente)
          const lastPhone = stats[chatId].lasts[phoneKey]
          const lastUser = stats[chatId].lasts[userKey]
          if (
            lastUser &&
            (!lastPhone || String(lastUser) > String(lastPhone))
          ) {
            stats[chatId].lasts[phoneKey] = lastUser
          }
          delete stats[chatId].lasts[userKey]

          // joins (manter a mais antiga)
          const joinPhone = stats[chatId].joins[phoneKey]
          const joinUser = stats[chatId].joins[userKey]
          if (
            joinUser &&
            (!joinPhone || String(joinUser) < String(joinPhone))
          ) {
            stats[chatId].joins[phoneKey] = joinUser
          }
          delete stats[chatId].joins[userKey]

          // baselines (manter o menor)
          const basePhone = stats[chatId].baselines[phoneKey]
          const baseUser = stats[chatId].baselines[userKey]
          if (baseUser != null) {
            const bUser = Number(baseUser)
            const bPhone = Number(basePhone)
            if (
              !Number.isFinite(bPhone) ||
              (Number.isFinite(bUser) && bUser < bPhone)
            ) {
              stats[chatId].baselines[phoneKey] = bUser
            }
          }
          delete stats[chatId].baselines[userKey]
        }
      }

      stats[chatId].total = (stats[chatId].total || 0) + 1
      stats[chatId].users[preferredSender] =
        (stats[chatId].users[preferredSender] || 0) + 1
      // registrar timestamp ISO da última mensagem desse remetente neste chat
      try {
        stats[chatId].lasts[preferredSender] = new Date().toISOString()
      } catch (e) {
        // ignore timestamp write errors
      }
      writeJSON('stats.json', stats)
    } catch (e) {
      console.error('Erro ao atualizar contagem de mensagens:', e)
    }

    // Castigo (mute por participante): apagar mensagens enquanto estiver mutado.
    // Se não for possível apagar (bot não-admin), ao menos ignora comandos do mutado.
    let mutedActive = false
    try {
      chat = await message.getChat()
      if (chat && chat.isGroup) {
        const chatId = message.from || message.author || ''
        const senderRaw = message.author || message.from || ''
        const senderId = toDigitsParticipantId(senderRaw) || senderRaw

        // Em contas recentes, o remetente pode vir como @lid. Melhor esforço:
        // - usar dígitos reais do contato, quando disponíveis
        // - tentar também chaves em +<digits> e <digits>@c.us
        const senderDigits = (() => {
          try {
            const fromContact =
              (contact &&
                (contact.number || (contact.id && contact.id.user))) ||
              null
            return (
              digitsOnly(fromContact) ||
              digitsOnly(String(senderId).split('@')[0])
            )
          } catch (e) {
            return digitsOnly(String(senderId).split('@')[0])
          }
        })()

        const candidateKeys = [senderId]
        if (senderDigits) {
          candidateKeys.push(`+${senderDigits}`)
          candidateKeys.push(`${senderDigits}@c.us`)
        }

        const mutes = readJSON('mutes.json') || {}
        let entry = null
        let matchedKey = null
        if (mutes[chatId]) {
          for (const k of candidateKeys) {
            if (!k) continue
            if (mutes[chatId][k]) {
              entry = mutes[chatId][k]
              matchedKey = k
              break
            }
          }
        }
        if (entry) {
          const expiresAt = Number(entry)
          if (!Number.isNaN(expiresAt) && expiresAt > Date.now()) {
            mutedActive = true
            try {
              // true => delete for everyone (requer bot admin)
              await message.delete(true)
              return
            } catch (e) {
              // se não conseguir apagar, pelo menos ignora comandos desse usuário
              // (não dá return aqui ainda; abaixo vamos tratar comandos)
            }
          } else {
            // expirou: limpar
            try {
              if (mutes[chatId]) {
                // limpar todas as chaves candidatas, para evitar sobras (+55..., @c.us, etc)
                for (const k of candidateKeys) {
                  if (!k) continue
                  if (mutes[chatId][k]) delete mutes[chatId][k]
                }
                if (matchedKey && mutes[chatId][matchedKey]) {
                  delete mutes[chatId][matchedKey]
                }
                writeJSON('mutes.json', mutes)
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }
    } catch (e) {
      // ignore enforcement errors
    }

    if (!message.body && !message.hasMedia) return
    const text = String(message.body || '').trim()

    if (mutedActive && text.startsWith('!')) return

    // MutarGrupo: bloqueia comandos para não-admins (quando ativado)
    try {
      if (text.startsWith('!')) {
        if (!chat) chat = await message.getChat()
        if (chat && chat.isGroup) {
          const settings = readJSON('groupSettings.json') || {}
          const chatId = message.from || message.author || ''
          const cfg = settings[chatId] || {}
          const enabled =
            cfg && cfg.mutargrupo && cfg.mutargrupo.enabled === true

          if (enabled) {
            const senderRaw = message.author || message.from || ''
            const senderId = toDigitsParticipantId(senderRaw) || senderRaw

            const digitsOnlySafe = s => String(s || '').replace(/\D/g, '')
            const suffix9 = d => {
              const x = digitsOnlySafe(d)
              return x.length >= 9 ? x.slice(-9) : x
            }

            // Melhor esforço: pegar dígitos reais do remetente via contact (útil com @lid)
            const senderDigits = (() => {
              const fromContact =
                (contact &&
                  (contact.number || (contact.id && contact.id.user))) ||
                null
              return digitsOnlySafe(fromContact) || digitsOnlySafe(senderId)
            })()

            const admins = (chat.participants || [])
              .filter(p => p && (p.isAdmin || p.isSuperAdmin))
              .map(p => {
                const pid = p && p.id && (p.id._serialized || p.id.user)
                return toDigitsParticipantId(pid) || (p.id && p.id._serialized)
              })
              .filter(Boolean)

            const adminDigits = new Set(
              admins
                .map(a => digitsOnlySafe(String(a).split('@')[0]))
                .filter(Boolean)
            )

            const isAdmin = (() => {
              if (!senderId) return false
              if (admins.includes(senderId)) return true
              if (senderDigits && adminDigits.has(senderDigits)) return true
              const s9 = suffix9(senderDigits)
              if (s9) {
                for (const ad of adminDigits) {
                  if (suffix9(ad) === s9) return true
                }
              }
              return false
            })()
            if (!isAdmin) return
          }
        }
      }
    } catch (e) {
      // ignore enforcement errors
    }

    // AutoSticker: quando ativado no grupo, converte mídia em figurinha automaticamente.
    // Observação: mensagens sem legenda normalmente têm body vazio, por isso tratamos antes do return.
    try {
      if (!text.startsWith('!')) {
        if (!chat) chat = await message.getChat()
        if (chat && chat.isGroup && message.hasMedia) {
          const settings = readJSON('groupSettings.json') || {}
          const chatId = message.from || message.author || ''
          const cfg = settings[chatId] || {}
          const enabled =
            cfg && cfg.autosticker && cfg.autosticker.enabled === true

          if (enabled) {
            const media = await message.downloadMedia()
            if (media && media.mimetype) {
              // não converter figurinhas (webp) novamente
              if (!String(media.mimetype).toLowerCase().includes('webp')) {
                const { MessageMedia } = require('whatsapp-web.js')
                const pack = String(process.env.STICKER_PACK || 'Bot')
                const author = String(process.env.STICKER_AUTHOR || 'Auto')
                const mm = new MessageMedia(media.mimetype, media.data)
                await message.reply(mm, undefined, {
                  sendMediaAsSticker: true,
                  stickerName: pack,
                  stickerAuthor: author
                })
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore autosticker errors
    }

    if (!text.startsWith('!')) return

    // Parsing do comando no formato "!comando arg1 arg2 ..."
    const parts = text.slice(1).split(/\s+/)
    const name = parts[0].toLowerCase()
    const args = parts.slice(1)

    const userId = message.author || message.from
    if (!limiter.tryRemoveTokens(userId, 1)) {
      return message.reply(
        'Você está enviando comandos rápido demais. Tente novamente mais tarde.'
      )
    }

    // Resolve e executa comando.
    const cmd = commands.get(name)
    if (!cmd) return message.reply('Comando não encontrado. Use !help')

    await cmd.execute({ message, args, client, sendToLLM })
  } catch (err) {
    console.error('Erro no handler de mensagem:', err)
  }
})

client.initialize()

// Health-check simples: testa o LLM (quando configurado).
;(async () => {
  try {
    const r = await sendToLLM('Diga olá em português')
    console.log('LLM test:', r)
  } catch (e) {
    // ignore
  }
})()

// Handler: enviar mensagem de boas-vindas quando participantes entram (se ativado).
// Também:
// - registra join em stats.json (baseline)
// - ao detectar saída/remoção, remove chaves do stats.json
// - aplica blacklist global (autoban)
async function handleWelcomeEvent(notification) {
  try {
    const welcomeDebug = String(process.env.WELCOME_DEBUG || '').trim() === '1'
    if (welcomeDebug) {
      try {
        console.log(
          '[welcome] event received:',
          JSON.stringify(notification || {}, null, 2)
        )
      } catch (e) {
        console.log('[welcome] event received (não foi possível serializar)')
      }
    }
    const settings = readJSON('groupSettings.json') || {}

    // tentar extrair chatId de diferentes formatos de notificação
    let chatId = null
    if (!notification) return
    if (typeof notification === 'string') chatId = notification
    else if (notification.chatId && typeof notification.chatId === 'string')
      chatId = notification.chatId
    else if (
      notification.id &&
      notification.id.remote &&
      typeof notification.id.remote === 'string'
    )
      chatId = notification.id.remote
    else if (notification.from && typeof notification.from === 'string')
      chatId = notification.from
    else if (
      notification.chat &&
      notification.chat.id &&
      notification.chat.id._serialized
    )
      chatId = notification.chat.id._serialized
    else if (notification.id && typeof notification.id === 'string')
      chatId = notification.id
    else if (
      notification.id &&
      notification.id._serialized &&
      typeof notification.id._serialized === 'string'
    )
      chatId = notification.id._serialized

    // Se a lib informar uma ação, filtramos e tratamos saída/remoção para manter stats sincronizado.
    try {
      const action = String(
        (notification && (notification.action || notification.type)) || ''
      ).toLowerCase()
      if (action && ['remove', 'leave'].includes(action)) {
        // atualizar stats removendo participantes que saíram
        try {
          let chatIdForLeave = null
          if (notification.chatId && typeof notification.chatId === 'string')
            chatIdForLeave = notification.chatId
          else if (
            notification.id &&
            notification.id.remote &&
            typeof notification.id.remote === 'string'
          )
            chatIdForLeave = notification.id.remote
          else if (notification.from && typeof notification.from === 'string')
            chatIdForLeave = notification.from
          if (chatIdForLeave) {
            const m = String(chatIdForLeave).match(/(\d+@g\.us)/)
            if (m && m[1]) chatIdForLeave = m[1]

            let participantsRaw =
              notification.recipientIds ||
              notification.removedParticipants ||
              notification.participantsRemoved ||
              notification.removed ||
              notification.who ||
              []
            if (!Array.isArray(participantsRaw)) {
              participantsRaw = participantsRaw ? [participantsRaw] : []
            }

            const participants = []
            for (const p of participantsRaw) {
              if (!p) continue
              if (typeof p === 'string') participants.push(p)
              else if (p.id && p.id._serialized)
                participants.push(p.id._serialized)
              else if (p._serialized) participants.push(p._serialized)
              else if (p.id && typeof p.id === 'string') participants.push(p.id)
            }

            const normalizedParticipants = participants
              .map(p => {
                try {
                  if (typeof p !== 'string') return null
                  if (/@/.test(p)) return p
                  const num = p.replace(/\D/g, '')
                  if (num) return `${num}@c.us`
                  return null
                } catch (e) {
                  return null
                }
              })
              .filter(Boolean)

            const stats = readJSON('stats.json') || {}
            if (
              !stats[chatIdForLeave] ||
              typeof stats[chatIdForLeave] !== 'object'
            ) {
              return
            }
            stats[chatIdForLeave].users = stats[chatIdForLeave].users || {}
            stats[chatIdForLeave].lasts = stats[chatIdForLeave].lasts || {}
            stats[chatIdForLeave].joins = stats[chatIdForLeave].joins || {}
            stats[chatIdForLeave].baselines =
              stats[chatIdForLeave].baselines || {}

            const now = new Date().toISOString()

            // Resolve chaves possíveis do participante (telefone, lid e fallback).
            async function computeKeys(participantId) {
              try {
                const raw = String(participantId || '').trim()
                if (!raw) return []

                const keys = new Set()
                const directKey = phoneKeyFromId(raw)
                if (directKey) keys.add(directKey)

                if (client && typeof client.getContactById === 'function') {
                  try {
                    const c = await client.getContactById(raw)
                    const num = digitsOnly((c && c.number) || '')
                    if (num) keys.add(`+${num}`)
                    const userDigits = digitsOnly(
                      (c && c.id && c.id.user) || ''
                    )
                    if (userDigits) keys.add(`+${userDigits}`)
                  } catch (e) {}
                }

                const norm = normalizeUserId(raw)
                if (norm) keys.add(norm)

                return [...keys]
              } catch (e) {
                return []
              }
            }

            for (const pid of normalizedParticipants) {
              const keys = await computeKeys(pid)
              if (!keys || keys.length === 0) continue
              for (const key of keys) {
                delete stats[chatIdForLeave].users[key]
                delete stats[chatIdForLeave].lasts[key]
                delete stats[chatIdForLeave].joins[key]
                delete stats[chatIdForLeave].baselines[key]
                // opcional: registrar a saída como último evento (não usado no ranking)
                try {
                  stats[chatIdForLeave].lasts[`left:${key}`] = now
                } catch (e) {}
              }
            }
            writeJSON('stats.json', stats)
          }
        } catch (e) {
          // ignore
        }

        if (welcomeDebug)
          console.log('[welcome] saída/removido processado:', action)
        return
      }

      if (action && !['add', 'join', 'invite'].includes(action)) {
        if (welcomeDebug) console.log('[welcome] ignorando ação:', action)
        return
      }
    } catch (e) {
      // ignore
    }

    // Alguns eventos podem entregar chatId como objeto com _serialized
    try {
      if (chatId && typeof chatId === 'object') {
        if (chatId._serialized) chatId = chatId._serialized
        else if (chatId.id && chatId.id._serialized)
          chatId = chatId.id._serialized
      }
      if (
        !chatId &&
        notification &&
        typeof notification === 'object' &&
        notification.chatId &&
        typeof notification.chatId === 'object'
      ) {
        if (notification.chatId._serialized)
          chatId = notification.chatId._serialized
        else if (notification.chatId.id && notification.chatId.id._serialized)
          chatId = notification.chatId.id._serialized
      }
    } catch (e) {
      // ignore
    }

    if (!chatId) {
      console.log('[welcome] não foi possível extrair chatId da notificação')
      return
    }

    const rawChatId = chatId

    // normalizar: se chatId vier com partes extras (ex: "false_120..._..."),
    // extrair a primeira ocorrência que termina com @g.us
    try {
      const m = String(chatId).match(/(\d+@g\.us)/)
      if (m && m[1]) {
        chatId = m[1]
      }
    } catch (e) {
      // ignore
    }

    const groupCfg = settings[chatId] || settings[rawChatId] || null

    if (welcomeDebug && !groupCfg) {
      try {
        console.log('[welcome] config não encontrada para chatId:', chatId)
        console.log('[welcome] rawChatId:', rawChatId)
        console.log(
          '[welcome] chaves em groupSettings.json:',
          Object.keys(settings || {})
        )
      } catch (e) {
        // ignore
      }
    }

    const defaultMsg =
      '✨ *BEM-VINDO(A) A SOCIEDADE DO CAOS*!\n\n💃 *APRESENTAÇÃO* 🕺:\n\n📸 *FOTO*:\n\n✅ *NOME*:\n\n🔞 *IDADE*:\n\n☄️ *SIGNO*:\n\n👅*ORIENTAÇÃO SEXUAL*:Hétero, gay, bi, etc.\n\n❤️ *ESTADO CIVIL*: Solteiro, namorando, casado e/ou outros\n\n🏡 *BAIRRO OU CIDADE*:\n\n📷 *INSTAGRAM*:\n\n✨ *TIPO DE ROLÊ PREFERIDO*:\n\n\n\n\n*Não apresentação ou interação sujeita a remoção do grupo*\n\nGentileza ler as regras do grupo. Comando: !regras'
    const welcomeEnabled = !!(
      groupCfg &&
      groupCfg.bemvindo &&
      groupCfg.bemvindo.enabled
    )
    const text =
      (groupCfg && groupCfg.bemvindo && groupCfg.bemvindo.message) || defaultMsg

    // extrair lista de participantes da notificação (várias chaves possíveis)
    // wwebjs costuma usar `recipientIds` para quem entrou/foi adicionado.
    let participantsRaw =
      notification.recipientIds ||
      notification.recipients ||
      notification.participants ||
      notification.participantsAdded ||
      notification.added ||
      notification.who ||
      notification.addedParticipants ||
      []

    if (!Array.isArray(participantsRaw)) {
      participantsRaw = participantsRaw ? [participantsRaw] : []
    }

    const participants = []
    for (const p of participantsRaw) {
      if (!p) continue
      if (typeof p === 'string') participants.push(p)
      else if (p.id && p.id._serialized) participants.push(p.id._serialized)
      else if (p._serialized) participants.push(p._serialized)
      else if (p.id && typeof p.id === 'string') participants.push(p.id)
    }

    // Preservar IDs como vêm (incluindo @lid). A lib resolve lid/phone internamente.
    let normalizedParticipants = participants
      .map(p => {
        try {
          if (typeof p !== 'string') return null
          if (/@/.test(p)) return p
          const num = p.replace(/\D/g, '')
          if (num) return `${num}@c.us`
          return null
        } catch (e) {
          return null
        }
      })
      .filter(Boolean)

    // Constrói texto de @menções e entidades (Contact) quando a lib permite.
    async function buildMentionsFromParticipants(pids) {
      const mentionIds = (pids || [])
        .map(p => {
          try {
            return toDigitsParticipantId(p) || p
          } catch (e) {
            return null
          }
        })
        .filter(Boolean)

      const uniqueMentionIds = [...new Set(mentionIds)]
      let mentionContacts = []
      try {
        if (client && typeof client.getContactById === 'function') {
          mentionContacts = (
            await Promise.all(
              uniqueMentionIds.map(async id => {
                try {
                  return await client.getContactById(id)
                } catch (e) {
                  return null
                }
              })
            )
          ).filter(Boolean)
        }
      } catch (e) {
        mentionContacts = []
      }

      const mentionEntities =
        mentionContacts.length > 0 ? mentionContacts : uniqueMentionIds

      const mentionText = (() => {
        try {
          const items = Array.isArray(mentionEntities) ? mentionEntities : []
          const parts = items
            .map(ent => {
              // Quando for Contact, preferir `number` (telefone real).
              // Em contas recentes, `id.user` pode ser um id interno (@lid).
              if (ent && typeof ent === 'object') {
                const num = digitsOnly(ent.number)
                if (num) return `@${num}`
                const userDigits = digitsOnly(ent.id && ent.id.user)
                if (userDigits) return `@${userDigits}`
                const userRaw = String((ent.id && ent.id.user) || '').trim()
                return userRaw ? `@${userRaw}` : ''
              }

              // Quando for string id (ex.: 5511...@c.us ou ...@lid)
              const raw = String(ent || '')
                .split('@')[0]
                .trim()
              const d = digitsOnly(raw)
              return d || raw ? `@${d || raw}` : ''
            })
            .filter(Boolean)

          return parts.join(' ')
        } catch (e) {
          return ''
        }
      })()

      return { mentionText, mentionEntities }
    }

    // Insere o texto de menções na primeira linha útil (geralmente "BEM-VINDO").
    // Mantém a mensagem configurada e evita duplicar menções.
    function injectMentionBesideWelcomeTitle(baseText, atText) {
      try {
        const t = String(baseText || '')
        const a = String(atText || '').trim()
        if (!a) return t
        if (!t) return a

        const lines = t.split(/\r\n|\n|\r/)

        // Prioriza a primeira linha não-vazia que contenha BEM-VINDO.
        let idx = lines.findIndex(l => /bem-?vindo/i.test(String(l || '')))
        if (idx < 0) idx = lines.findIndex(l => String(l || '').trim())
        if (idx < 0) idx = 0

        const line = String(lines[idx] || '')
        // Evita duplicar se já tiver @ na linha (ou se já inseriu antes)
        if (!line.includes(a)) {
          lines[idx] = line.trimEnd() + ' ' + a
        }
        return lines.join('\n')
      } catch (e) {
        return atText
          ? `${atText}\n\n${baseText || ''}`
          : String(baseText || '')
      }
    }

    // Registrar horário de entrada (para não expulsar automaticamente quem acabou de entrar)
    try {
      const stats = readJSON('stats.json') || {}
      stats[chatId] = stats[chatId] || {
        total: 0,
        users: {},
        lasts: {},
        joins: {}
      }
      stats[chatId].joins = stats[chatId].joins || {}
      stats[chatId].users = stats[chatId].users || {}
      stats[chatId].baselines = stats[chatId].baselines || {}
      const nowIso = new Date().toISOString()

      // Resolve chaves de join para salvar baseline/joins (inclui fallback para @lid).
      async function computeJoinKeys(participantId) {
        try {
          const raw = String(participantId || '').trim()
          if (!raw) return []
          const keys = new Set()

          // Caso comum: ids com digitos
          const directKey = phoneKeyFromId(raw)
          if (directKey) keys.add(directKey)

          // Tentar resolver numero real via contato (util para ids @lid)
          if (client && typeof client.getContactById === 'function') {
            try {
              const c = await client.getContactById(raw)
              const num = digitsOnly((c && c.number) || '')
              if (num) keys.add(`+${num}`)
              const userDigits = digitsOnly((c && c.id && c.id.user) || '')
              if (userDigits) keys.add(`+${userDigits}`)
            } catch (e) {
              // ignore
            }
          }

          // Fallback: salva alguma chave estavel (pode nao ser numerica)
          const norm = normalizeUserId(raw)
          if (norm) keys.add(norm)

          return [...keys]
        } catch (e) {
          return []
        }
      }

      for (const pid of normalizedParticipants) {
        const keys = await computeJoinKeys(pid)
        if (!keys || keys.length === 0) continue
        for (const key of keys) {
          // baseline: garante que a contagem comece do zero a partir deste join
          // sem apagar o histórico já armazenado.
          const currentCount = Number(stats[chatId].users[key]) || 0
          stats[chatId].baselines[key] = currentCount
          // Sempre atualiza o join na reentrada (evita puxar dados antigos)
          stats[chatId].joins[key] = nowIso
        }
      }
      writeJSON('stats.json', stats)
    } catch (e) {
      // ignore
    }

    console.log('[welcome] usando chatId key para configuração:', chatId)

    try {
      const chat = await client.getChatById(chatId)
      if (!chat) {
        console.log('[welcome] chat não encontrado para', chatId)
        return
      }

      // Autoban: se o participante está na blacklist global, remove automaticamente.
      // Mantém o comportamento "em qualquer grupo".
      try {
        const bl = readJSON('blacklist.json') || {}
        const globalList =
          (bl && typeof bl.globalList === 'object' && bl.globalList) || {}

        const blocked = []
        const allowed = []

        for (const pid of normalizedParticipants) {
          const key = await (async () => {
            try {
              const raw = String(pid || '').trim()
              if (!raw) return null
              const directKey = phoneKeyFromId(raw)
              if (directKey) return directKey
              if (client && typeof client.getContactById === 'function') {
                try {
                  const c = await client.getContactById(raw)
                  const num = digitsOnly((c && c.number) || '')
                  if (num) return `+${num}`
                  const userDigits = digitsOnly((c && c.id && c.id.user) || '')
                  if (userDigits) return `+${userDigits}`
                } catch (e) {}
              }
              const norm = normalizeUserId(raw)
              return norm || null
            } catch (e) {
              return null
            }
          })()

          if (key && globalList[key]) blocked.push(pid)
          else allowed.push(pid)
        }

        if (blocked.length > 0) {
          try {
            await chat.removeParticipants(blocked)
            await chat.sendMessage(
              `🚫 Autoban: ${blocked.length} participante(s) removido(s) por estar(em) na *lista*.`
            )
          } catch (e) {
            // ignore removal errors
          }

          // Se todos eram bloqueados, não há por que mandar boas-vindas.
          if (allowed.length === 0) return

          // Atualizar arrays para boas-vindas só dos permitidos
          normalizedParticipants = allowed
        }
      } catch (e) {
        // ignore blacklist errors
      }

      if (!welcomeEnabled) {
        console.log('[welcome] boas-vindas desativado para', chatId)
        return
      }

      const { mentionText, mentionEntities } =
        await buildMentionsFromParticipants(normalizedParticipants)

      const welcomeText = mentionText
        ? injectMentionBesideWelcomeTitle(text, mentionText)
        : text
      if (mentionEntities.length > 0) {
        await chat.sendMessage(welcomeText, { mentions: mentionEntities })
      } else {
        await chat.sendMessage(welcomeText)
      }
      console.log('[welcome] mensagem enviada para', chatId)

      // Pedir que o novo participante leia as regras
      try {
        // Evita duplicar se a mensagem configurada já manda ler regras
        const alreadyMentionsRules = /\!regras\b/i.test(String(text || ''))
        if (!alreadyMentionsRules) {
          const rulesMsg = mentionText
            ? `${mentionText} Por favor, leia as regras do grupo com *!regras*.`
            : 'Por favor, leia as regras do grupo com *!regras*.'
          if (mentionEntities.length > 0) {
            await chat.sendMessage(rulesMsg, { mentions: mentionEntities })
          } else {
            await chat.sendMessage(rulesMsg)
          }
        }
        console.log('[welcome] pedido para ler regras enviado para', chatId)
      } catch (e) {
        console.log(
          '[welcome] erro ao enviar pedido de regras:',
          e && e.toString()
        )
      }
    } catch (e) {
      console.error('Erro ao enviar mensagem de boas-vindas:', e && e.message)
    }
  } catch (err) {
    console.error('Erro no handler de boas-vindas:', err && err.message)
  }
}

// Registrar handlers compatíveis com diferentes versões da lib
client.on('group_participants_changed', handleWelcomeEvent)
client.on('group_join', handleWelcomeEvent)
