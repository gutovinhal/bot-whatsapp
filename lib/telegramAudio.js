const os = require('os')
const fs = require('fs')
const path = require('path')

/**
 * Integração opcional com Telegram (GramJS).
 *
 * Objetivo: buscar e baixar o melhor áudio possível em canais/grupos configurados,
 * para ser reutilizado por comandos de playback.
 *
 * Dependências e configuração (via `.env`):
 * - `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_SESSION`
 * - `TELEGRAM_SOURCE` (lista de fontes)
 */

let TelegramClient
let StringSession
let Api

let clientPromise = null
let cachedSourceEntities = null

// Limpa texto de forma segura para comparações/armazenamento.
function cleanText(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Normalização focada em "match" de pesquisa:
// - minúsculas
// - remove acentos
// - remove pontuação
// - normaliza espaços
function normalizeForMatch(s) {
  return cleanText(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const MATCH_STOPWORDS = new Set([
  'a',
  'o',
  'os',
  'as',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'pra',
  'pro',
  'para',
  'por',
  'com',
  'um',
  'uma',
  'the',
  'of',
  'and',
  'official',
  'video',
  'videoclipe',
  'clipe',
  'lyric',
  'lyrics',
  'audio'
])

// Quebra um texto em tokens úteis para match, removendo stopwords.
function tokenizeForMatch(s) {
  const norm = normalizeForMatch(s)
  if (!norm) return []
  return norm
    .split(' ')
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => !MATCH_STOPWORDS.has(t))
}

// Similaridade de Jaccard entre 2 conjuntos de tokens.
function jaccardSimilarity(aTokens, bTokens) {
  const a = new Set(Array.isArray(aTokens) ? aTokens : [])
  const b = new Set(Array.isArray(bTokens) ? bTokens : [])
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter += 1
  const union = a.size + b.size - inter
  return union <= 0 ? 0 : inter / union
}

// Calcula uma pontuação para escolher o melhor áudio encontrado.
// Heurística: título pesa mais, performer e nome do arquivo ajudam.
function scoreCandidate({ title, performer, fileName }, query) {
  const qNorm = normalizeForMatch(query)
  const qTokens = tokenizeForMatch(query)

  const tNorm = normalizeForMatch(title)
  const pNorm = normalizeForMatch(performer)

  const tTokens = tokenizeForMatch(title)
  const pTokens = tokenizeForMatch(performer)
  const fTokens = tokenizeForMatch(fileName)

  let score = 0

  score += 0.75 * jaccardSimilarity(tTokens, qTokens)
  score += 0.25 * jaccardSimilarity(pTokens, qTokens)
  score += 0.15 * jaccardSimilarity(fTokens, qTokens)

  if (qNorm && tNorm && tNorm.includes(qNorm)) score += 0.35
  if (qNorm && pNorm && pNorm.includes(qNorm)) score += 0.1

  return score
}

// Tenta inferir a extensão do arquivo pelo nome.
function guessExtFromFileName(name) {
  const m = String(name || '').match(/\.([a-z0-9]{2,5})$/i)
  if (!m) return null
  return String(m[1]).toLowerCase()
}

// Verifica se um documento do Telegram parece ser áudio.
function isAudioDocument(document) {
  const mime = cleanText(document && document.mimeType).toLowerCase()
  if (mime.startsWith('audio/')) return true

  const attrs = Array.isArray(document && document.attributes)
    ? document.attributes
    : []
  return attrs.some(a => a && a.className === 'DocumentAttributeAudio')
}

// Extrai metadados de áudio do documento (quando disponíveis).
function extractAudioMeta(document) {
  const attrs = Array.isArray(document && document.attributes)
    ? document.attributes
    : []

  let title = ''
  let performer = ''
  let fileName = ''

  for (const a of attrs) {
    if (!a) continue
    // GramJS: Api.DocumentAttributeAudio
    if (a.className === 'DocumentAttributeAudio') {
      title = cleanText(a.title)
      performer = cleanText(a.performer)
    }
    if (a.className === 'DocumentAttributeFilename') {
      fileName = cleanText(a.fileName)
    }
  }

  return { title, performer, fileName }
}

// Lê lista de fontes (canais/grupos/peers) configuradas via env.
// Formato: valores separados por vírgula.
function parseSourceList(raw) {
  const s = cleanText(raw)
  if (!s) return []
  return s
    .split(',')
    .map(x => cleanText(x))
    .filter(Boolean)
}

// Para descoberta de canais públicos, usa uma query mais curta.
function pickDiscoveryQuery(query) {
  const tokens = tokenizeForMatch(query)
  if (tokens.length === 0) return cleanText(query)
  // Usa poucos termos para discovery por nome (mais chance de achar canal)
  return tokens.slice(0, Math.min(3, tokens.length)).join(' ')
}

// Carrega GramJS (pacote `telegram`) apenas quando necessário.
// Isso permite que o bot funcione mesmo sem a dependência instalada,
// desde que os comandos que usam Telegram não sejam chamados.
async function lazyLoadGramJs() {
  if (TelegramClient && StringSession && Api) return
  // dependência: `telegram` (GramJS)
  // carregamento lazy para não quebrar o bot caso não esteja instalado
  const telegram = require('telegram')
  TelegramClient = telegram.TelegramClient
  Api = telegram.Api
  StringSession = require('telegram/sessions').StringSession
}

// Cria (e cacheia) uma conexão com Telegram usando credenciais do .env.
async function getClient() {
  await lazyLoadGramJs()

  if (clientPromise) return clientPromise

  clientPromise = (async () => {
    const apiId = Number(process.env.TELEGRAM_API_ID)
    const apiHash = cleanText(process.env.TELEGRAM_API_HASH)
    const session = cleanText(process.env.TELEGRAM_SESSION)

    if (!apiId || !apiHash || !session) {
      const err = new Error('Telegram não configurado')
      err.code = 'TELEGRAM_NOT_CONFIGURED'
      throw err
    }

    const client = new TelegramClient(
      new StringSession(session),
      apiId,
      apiHash,
      {
        connectionRetries: 2
      }
    )

    await client.connect()
    return client
  })()

  return clientPromise
}

// Resolve (e cacheia) entidades das fontes configuradas em TELEGRAM_SOURCE.
async function resolveSourceEntities(client) {
  if (cachedSourceEntities) return cachedSourceEntities
  const sources = parseSourceList(process.env.TELEGRAM_SOURCE || '')
  if (sources.length === 0) {
    cachedSourceEntities = []
    return cachedSourceEntities
  }

  const out = []
  for (const ref of sources.slice(0, 15)) {
    try {
      const ent = await client.getEntity(ref)
      if (ent) out.push(ent)
    } catch (e) {
      // ignora fonte inválida
    }
  }

  cachedSourceEntities = out
  return cachedSourceEntities
}

// Monta um link t.me quando a entidade tem username (canais públicos).
function buildMessageLink(entity, messageId) {
  try {
    const username = cleanText(entity && entity.username)
    if (!username) return null
    if (!messageId) return null
    return `https://t.me/${encodeURIComponent(username)}/${encodeURIComponent(
      String(messageId)
    )}`
  } catch (e) {
    return null
  }
}

// Helper defensivo: sempre retorna array.
function ensureArray(x) {
  return Array.isArray(x) ? x : []
}

// Varre mensagens retornadas pela API e coleta candidatos de áudio com score.
function collectAudioCandidatesFromMessages(messages, query) {
  const candidates = []
  for (const m of ensureArray(messages)) {
    const doc = m && m.media && m.media.document
    if (!doc) continue
    if (!isAudioDocument(doc)) continue

    const meta = extractAudioMeta(doc)
    const title = cleanText(meta.title) || cleanText(m.message)
    const performer = cleanText(meta.performer)
    const fileName = cleanText(meta.fileName)

    const score = scoreCandidate({ title, performer, fileName }, query)
    candidates.push({
      message: m,
      document: doc,
      title,
      performer,
      fileName,
      score
    })
  }
  return candidates
}

// Busca músicas dentro de um peer específico (canal/grupo/diálogo).
async function searchMusicInPeer({ client, peer, query, limit = 25 }) {
  const res = await client.invoke(
    new Api.messages.Search({
      peer,
      q: query,
      filter: new Api.InputMessagesFilterMusic(),
      minDate: 0,
      maxDate: 0,
      offsetId: 0,
      addOffset: 0,
      limit: Math.max(1, Math.min(50, Number(limit) || 25)),
      maxId: 0,
      minId: 0,
      hash: 0
    })
  )

  return collectAudioCandidatesFromMessages(res && res.messages, query)
}

// Busca global (em todos os diálogos acessíveis) usando SearchGlobal.
async function searchGlobalMusic({ client, query, limit = 25 }) {
  try {
    const res = await client.invoke(
      new Api.messages.SearchGlobal({
        q: query,
        filter: new Api.InputMessagesFilterMusic(),
        minDate: 0,
        maxDate: 0,
        offsetRate: 0,
        offsetId: 0,
        offsetPeer: new Api.InputPeerEmpty(),
        limit: Math.max(1, Math.min(50, Number(limit) || 25))
      })
    )

    return collectAudioCandidatesFromMessages(res && res.messages, query)
  } catch (e) {
    return []
  }
}

// Descoberta best-effort de peers públicos por nome (limitada por env).
async function discoverPublicPeers({ client, query }) {
  const allow =
    String(process.env.TELEGRAM_ALLOW_PUBLIC_DISCOVERY || '1').trim() !== '0'
  if (!allow) return []

  const limit = Math.max(
    1,
    Math.min(10, Number(process.env.TELEGRAM_PUBLIC_PEERS_LIMIT || 5))
  )
  const q = pickDiscoveryQuery(query)
  if (!q) return []

  try {
    const res = await client.invoke(new Api.contacts.Search({ q, limit }))
    const chats = ensureArray(res && res.chats)

    // Filtra para peers que parecem canais/grupos e que são resolvíveis
    const peers = []
    for (const c of chats) {
      if (!c) continue
      const username = cleanText(c.username)
      const title = cleanText(c.title)
      if (!username && !title) continue
      peers.push(c)
    }
    return peers.slice(0, limit)
  } catch (e) {
    return []
  }
}

// Orquestra as buscas (global + fontes + descoberta pública) e escolhe o melhor.
async function searchBestAudioAnywhere({ query }) {
  const client = await getClient()

  const maxPeersSearch = Math.max(
    1,
    Math.min(15, Number(process.env.TELEGRAM_MAX_PEERS_SEARCH || 8))
  )
  const perPeerLimit = Math.max(
    5,
    Math.min(50, Number(process.env.TELEGRAM_PER_PEER_LIMIT || 25))
  )

  let candidates = []

  // 1) Busca em todos os diálogos da conta ("qualquer local" dentro do que a conta acessa)
  candidates = candidates.concat(
    await searchGlobalMusic({ client, query, limit: perPeerLimit })
  )

  // 2) Busca em fontes configuradas (se houver), útil para priorizar/forçar um repositório
  const sources = await resolveSourceEntities(client)
  for (const peer of sources.slice(0, maxPeersSearch)) {
    try {
      const found = await searchMusicInPeer({
        client,
        peer,
        query,
        limit: perPeerLimit
      })
      candidates = candidates.concat(found.map(x => ({ ...x, _peer: peer })))
    } catch (e) {
      // ignora
    }
  }

  // 3) Descoberta best-effort de canais públicos por nome (limitado)
  const publicPeers = await discoverPublicPeers({ client, query })
  for (const peer of publicPeers.slice(0, maxPeersSearch)) {
    try {
      const ent = peer.username ? await client.getEntity(peer.username) : peer
      const found = await searchMusicInPeer({
        client,
        peer: ent,
        query,
        limit: perPeerLimit
      })
      candidates = candidates.concat(found.map(x => ({ ...x, _peer: ent })))
    } catch (e) {
      // ignora
    }
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
  const best = candidates[0]

  // Preferir um peer com username para link
  const entity = best && (best._peer || null)
  return { best, entity }
}

// Baixa o melhor áudio encontrado no Telegram em um arquivo temporário.
// Retorna metadados e caminho do arquivo para o comando de playback.
async function downloadBestTelegramAudio({
  query,
  maxBytes = 15 * 1024 * 1024
}) {
  const minScore = Math.max(
    0,
    Math.min(1, Number(process.env.TELEGRAM_MIN_MATCH_SCORE || 0.35))
  )

  const result = await searchBestAudioAnywhere({ query })
  if (!result || !result.best) return null

  const { best, entity } = result
  if (Number(best.score || 0) < minScore) return null

  const size = Number(best.document && best.document.size)
  if (Number.isFinite(size) && size > Number(maxBytes)) {
    const err = new Error('Arquivo muito grande')
    err.code = 'FILE_TOO_LARGE'
    err.size = size
    throw err
  }

  const ext =
    guessExtFromFileName(best.fileName) ||
    (cleanText(best.document && best.document.mimeType)
      .toLowerCase()
      .startsWith('audio/ogg')
      ? 'ogg'
      : 'mp3')

  const tmpPath = path.join(
    os.tmpdir(),
    `bot-play-tg-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`
  )

  const client = await getClient()
  const downloadResult = await client.downloadMedia(best.message, {
    file: tmpPath
  })

  // Algumas versões retornam Buffer; garante que o arquivo exista.
  if (Buffer.isBuffer(downloadResult)) {
    fs.writeFileSync(tmpPath, downloadResult)
  }

  if (!fs.existsSync(tmpPath)) {
    const err = new Error('Falha ao baixar mídia do Telegram')
    err.code = 'TELEGRAM_DOWNLOAD_FAILED'
    throw err
  }

  const link = buildMessageLink(entity, best.message && best.message.id)

  return {
    tmpPath,
    title: cleanText(best.title) || cleanText(best.fileName) || 'Áudio',
    artist: cleanText(best.performer),
    score: Number(best.score || 0),
    telegramLink: link
  }
}

module.exports = {
  downloadBestTelegramAudio
}
