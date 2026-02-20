/**
 * Jogo Paredão
 * Escolhe um emparedado, define tempo e envia regras.
 */
module.exports = {
  name: 'paredao',
  description:
    '🔥 Paredão: escolha um participante para ser emparedado e responder perguntas.',
  usage: '*!jogos paredao* [tempo]',

  /**
   * Handler do jogo paredão.
   * @param {{ message: any, args: string[], client: any }} ctx
   */
  async execute({ message, args, client }) {
    const DEFAULT_MINUTES = 5
    const parseDelayMinutes = () => {
      const tokens = (args.slice(1) || []).map(t => String(t || ''))
      const cleaned = tokens.filter(Boolean)
      if (cleaned.length === 0) return DEFAULT_MINUTES
      const skip = new Set(['tempo', 'time'])
      const candidates = cleaned.filter(t => !skip.has(t.toLowerCase()))
      for (const t of candidates) {
        const m = t.match(/^([0-9]{1,4})(s|m|min|h|hr|hrs)?$/i)
        if (!m) continue
        const n = Number(m[1])
        if (!Number.isFinite(n) || n <= 0) continue
        const unit = String(m[2] || 'm').toLowerCase()
        if (unit === 's') return Math.max(1, Math.min(120, n / 60))
        if (unit === 'h' || unit === 'hr' || unit === 'hrs')
          return Math.max(1, Math.min(120, n * 60))
        return Math.max(1, Math.min(120, n))
      }
      return DEFAULT_MINUTES
    }
    const delayMinutes = parseDelayMinutes()
    const delayMs = Math.round(delayMinutes * 60 * 1000)
    // Tenta usar um alvo citado ou mencionado para preencher o emparedado.
    let targetId = null
    try {
      const mentioned = message.mentionedIds || []
      if (mentioned.length > 0) targetId = mentioned[0]
      if (!targetId && message.hasQuotedMsg) {
        const q = await message.getQuotedMessage()
        if (q && q.author) targetId = q.author
      }
    } catch (e) {}
    let exampleTargetId = null
    try {
      const chat = await message.getChat()
      if (chat && chat.isGroup && Array.isArray(chat.participants)) {
        let botId = null
        try {
          botId =
            (client &&
              client.info &&
              client.info.wid &&
              (client.info.wid._serialized || client.info.wid.user)) ||
            null
          if (botId && !String(botId).includes('@')) {
            botId = `${botId}@c.us`
          }
        } catch (e) {
          botId = null
        }
        const adminIds = chat.participants
          .filter(p => p && (p.isAdmin || p.isSuperAdmin))
          .map(p => {
            if (p.id && p.id._serialized) return p.id._serialized
            if (p.id && p.id.user) return `${String(p.id.user)}@c.us`
            if (p._serialized) return p._serialized
            return null
          })
          .filter(Boolean)
          .filter(id => !botId || id !== botId)
        if (adminIds.length > 0) {
          exampleTargetId =
            adminIds[Math.floor(Math.random() * adminIds.length)]
        }
      }
    } catch (e) {}
    const emparedadoExample = exampleTargetId
      ? `@${String(exampleTargetId).split('@')[0]} (exemplo)`
      : '@exemplo (exemplo)'
    const exampleMentions = exampleTargetId ? [exampleTargetId] : []
    await message.reply(
      '🔥 *PAREDÃO* 🔥\n\n' +
        '• *Explicação* •\n\n' +
        '1 - Um participante será escolhido como EMPAREDADO.\n' +
        `2 - O emparedado ficará ${Math.round(delayMinutes)} minutos no paredão.\n` +
        '3 - Durante esse tempo, todos do grupo podem fazer perguntas diretamente para ele(a).\n' +
        '4 - As perguntas devem ser difíceis, constrangedoras ou que coloquem em saia justa.\n' +
        '5 - O emparedado é obrigado a responder tudo, com sinceridade.\n' +
        '6 - Ao final, o emparedado escolhe outra pessoa para ser emparedado.\n\n' +
        '*Regras rápidas:*\n• Durante as respostas do emparedado, o resto do grupo deve permanecer em silêncio para acompanhar as respostas.\n\n' +
        `EMPAREDADO: ${emparedadoExample}\n⏳ O emparedado será definido em ${Math.round(delayMinutes)} min.\n\n` +
        '*Entendeu como funciona?*\n\n1 - Sim, reaja com 👍\n2 - Não, reaja com 👎\n\n🎉 Quem será o próximo emparedado?',
      undefined,
      exampleMentions.length > 0 ? { mentions: exampleMentions } : undefined
    )
    setTimeout(async () => {
      try {
        let finalTargetId = targetId
        if (!finalTargetId) {
          const chat = await message.getChat()
          if (chat && chat.isGroup && Array.isArray(chat.participants)) {
            let botId = null
            try {
              botId =
                (client &&
                  client.info &&
                  client.info.wid &&
                  (client.info.wid._serialized || client.info.wid.user)) ||
                null
              if (botId && !String(botId).includes('@')) {
                botId = `${botId}@c.us`
              }
            } catch (e) {
              botId = null
            }
            const ids = chat.participants
              .map(p => {
                if (!p) return null
                if (p.id && p.id._serialized) return p.id._serialized
                if (p.id && p.id.user) return `${String(p.id.user)}@c.us`
                if (p._serialized) return p._serialized
                return null
              })
              .filter(Boolean)
              .filter(id => !botId || id !== botId)
            if (ids.length > 0) {
              finalTargetId = ids[Math.floor(Math.random() * ids.length)]
            }
          }
        }
        if (!finalTargetId) {
          await message.reply(
            'Nao consegui escolher um emparedado automaticamente.'
          )
          return
        }
        const label = `@${String(finalTargetId).split('@')[0]}`
        await message.reply(
          `🔥*PAREDÃO*🔥\n\nEMPAREDADO: ${label}`,
          undefined,
          { mentions: [finalTargetId] }
        )
      } catch (e) {
        try {
          await message.reply(
            'Nao consegui escolher um emparedado automaticamente.'
          )
        } catch (err) {}
      }
    }, delayMs)
  }
}
