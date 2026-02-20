const { readJSON } = require('../lib/storage')

/**
 * Comando `!funcionalidades`.
 *
 * Mostra o status (ativo/inativo) das features/toggles do grupo.
 * Requer que o remetente seja admin do grupo.
 */

// Helpers de formatação/estado para exibir toggles por grupo.
function isEnabled(obj) {
  return !!(obj && typeof obj === 'object' && obj.enabled === true)
}

function formatExpulsarAuto(cfg) {
  const c = (cfg && typeof cfg === 'object' ? cfg : {}) || {}
  const minutes = Number(c.minutes)
  if (Number.isFinite(minutes) && minutes > 0) return `${minutes} min`
  const hours = Number(c.hours)
  if (Number.isFinite(hours) && hours > 0) return `${hours}h`
  return '48h'
}

function statusLabel(active, extra) {
  if (active) return extra ? `✅ Ativo (${extra})` : '✅ Ativo'
  return '❌ Inativo'
}

// Comando `!funcionalidades`: mostra status das features do grupo.
// Requer admin do grupo.
module.exports = {
  name: 'funcionalidades',
  description: '⚙️📌 Mostra o que está ativo/inativo no grupo.',
  usage: '*!funcionalidades*',

  /**
   * Handler do comando.
   * @param {{ message: any }} ctx
   */
  async execute({ message }) {
    try {
      const chat = await message.getChat()
      if (!chat || !chat.isGroup) {
        return await message.reply('Este comando só pode ser usado em grupos.')
      }

      // Normaliza um id para o formato aceito pela lib (preservando @lid quando existir).
      function toDigitsId(rawId) {
        const s = String(rawId || '').trim()
        if (!s) return null
        if (s.includes('@')) return s
        const digits = s.replace(/\D/g, '')
        return digits ? `${digits}@c.us` : null
      }

      // Confere se o remetente é admin (melhor esforço, depende do payload da lib).
      async function isSenderAdmin() {
        try {
          let senderId = null
          try {
            const contact = await message.getContact()
            if (contact && contact.id && contact.id._serialized)
              senderId = contact.id._serialized
            else if (contact && contact.id && contact.id.user)
              senderId = `${contact.id.user}@c.us`
          } catch (e) {
            senderId = message.author || message.from || null
          }

          senderId = toDigitsId(senderId) || senderId
          if (!senderId) return false

          const admins = (chat.participants || [])
            .filter(p => p && (p.isAdmin || p.isSuperAdmin))
            .map(p => {
              const pid = p && p.id && (p.id._serialized || p.id.user)
              return toDigitsId(pid) || (p && p.id && p.id._serialized) || null
            })
            .filter(Boolean)

          return admins.includes(senderId)
        } catch (e) {
          return false
        }
      }

      const adminOk = await isSenderAdmin()
      if (!adminOk) {
        return await message.reply(
          'Apenas administradores podem usar este comando.'
        )
      }

      const chatId = message.from || message.author || ''
      const settings = readJSON('groupSettings.json') || {}
      const cfg = settings[chatId] || {}

      const bemvindoOn = isEnabled(cfg.bemvindo)
      const mutarGrupoOn = isEnabled(cfg.mutargrupo)
      const expulsarAutoOn = isEnabled(cfg.expulsarauto)
      const expulsarAutoLimit = formatExpulsarAuto(cfg.expulsarauto)

      const lines = []

      lines.push('*⚙️ Funcionalidades do grupo*')
      lines.push(`• Bem-vindo: ${statusLabel(bemvindoOn)}`)
      lines.push(
        `• MutarGrupo (bloqueia comandos p/ não-admin): ${statusLabel(mutarGrupoOn)}`
      )
      lines.push(
        `• ExpulsarAuto (inatividade): ${statusLabel(expulsarAutoOn, expulsarAutoOn ? expulsarAutoLimit : null)}`
      )

      // Funcionalidades sempre ativas (não dependem de toggle)
      lines.push('')
      lines.push('*✅ Sempre ativo (neste bot)*')
      lines.push('• Contagem desde a entrada (não usa mensagens antigas)')
      lines.push('• Compatibilidade de IDs (@lid) para admins/menções/expulsão')

      // Itens presentes no menu mas ainda sem implementação real
      const notImpl = []
      const candidates = [
        { key: 'autosticker', label: 'AutoSticker' },
        { key: 'antifake', label: 'AntiFake' },
        { key: 'antilink', label: 'AntiLink' },
        { key: 'antiflood', label: 'AntiFlood' },
        { key: 'filtro', label: 'Filtro de palavras' },
        { key: 'avisos', label: 'Sistema de avisos' },
        { key: 'bloquearcmd', label: 'BloquearCmd' },
        { key: 'listanegra', label: 'ListaNegra' }
      ]

      for (const c of candidates) {
        const on = isEnabled(cfg[c.key])
        notImpl.push(
          `• ${c.label}: ${on ? '⚠️ Configurado' : '❌ Inativo'} (não implementado)`
        )
      }

      lines.push('')
      lines.push('*⛔ Ainda não implementado*')
      lines.push(notImpl.join('\n'))

      await message.reply(lines.join('\n'))
    } catch (e) {
      await message.reply('Erro ao ler funcionalidades do grupo.')
    }
  }
}
