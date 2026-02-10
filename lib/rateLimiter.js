// Rate limiter simples em memória (token bucket por chave).
// Usado para evitar spam de comandos por usuário.

/**
 * Rate limiter (token bucket) por chave, em memória.
 *
 * Uso típico:
 * - key = identificador do usuário (ex.: número)
 * - tokens/interval = limite de ações
 */
class RateLimiter {
  constructor({ tokens = 5, interval = 60000 } = {}) {
    this.tokens = tokens
    this.interval = interval
    this.map = new Map()
  }

  // Tenta consumir `count` tokens para a `key`.
  // Retorna true quando permitido; false quando excedeu o limite.
  tryRemoveTokens(key, count = 1) {
    const now = Date.now()
    const entry = this.map.get(key) || { tokens: this.tokens, last: now }
    // refill
    const elapsed = now - entry.last
    const refill = Math.floor(elapsed / this.interval) * this.tokens
    if (refill > 0) {
      entry.tokens = Math.min(this.tokens, entry.tokens + refill)
      entry.last = now
    }
    if (entry.tokens >= count) {
      entry.tokens -= count
      this.map.set(key, entry)
      return true
    }
    this.map.set(key, entry)
    return false
  }
}

// Exporta a classe para ser instanciada no entry-point.

module.exports = RateLimiter
