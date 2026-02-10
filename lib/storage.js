const fs = require('fs')
const path = require('path')

/**
 * Persistência simples em JSON na pasta `data/`.
 *
 * Usado para: stats, configurações de grupo, mutes e blacklist.
 * Observação: este módulo não valida schema; ele apenas lê/escreve JSON.
 */

// Pasta única para persistência simples em JSON.
// Aqui ficam stats, configurações de grupo, mutes e blacklist.
const dataDir = path.join(__dirname, '..', 'data')

/**
 * Garante que a pasta `data/` e os arquivos mínimos existam.
 * Cria JSON vazio quando não existir.
 */

// Garante que a pasta `data/` e os arquivos mínimos existam.
// Observação: não valida schema; apenas cria JSON vazio quando não existir.
function ensureDataDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  const files = [
    'blacklist.json',
    'stats.json',
    'groupSettings.json',
    'mutes.json'
  ]
  for (const f of files) {
    const p = path.join(dataDir, f)
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({}))
  }
}

/**
 * Lê um JSON do diretório `data/`.
 * @param {string} name Nome do arquivo (ex.: `stats.json`)
 * @returns {any|null} Objeto parseado ou `null` se não existir
 */

// Lê um JSON do diretório `data/`.
// Retorna `null` se o arquivo não existir.
function readJSON(name) {
  const p = path.join(dataDir, name)
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

/**
 * Grava um JSON no diretório `data/` com identação (para facilitar debug).
 * @param {string} name Nome do arquivo (ex.: `stats.json`)
 * @param {any} data Conteúdo a persistir
 */

// Grava um JSON no diretório `data/`, com identação para facilitar debug.
function writeJSON(name, data) {
  const p = path.join(dataDir, name)
  fs.writeFileSync(p, JSON.stringify(data, null, 2))
}

// Exporta helpers para uso no restante do bot.

module.exports = { ensureDataDir, readJSON, writeJSON }
