const { readJSON, writeJSON } = require('../lib/storage')

/**
 * Comando `!admin`.
 *
 * Administração do grupo: permissões, marcações, mute, toggles e rotinas auxiliares.
 * Este arquivo é grande porque concentra muitos subcomandos.
 */

// Comando `!admin`: administração por grupo.
// Responsabilidades típicas:
// - checar permissões (somente admins)
// - mutar/desmutar participantes (castigo) via `data/mutes.json`
// - controlar toggles de grupo em `data/groupSettings.json`
// - interagir com stats/blacklist para automações (inatividade/autoban)
// Observação: este arquivo contém muitos subcomandos e helpers internos.

module.exports = {
  name: 'admin',
  description:
    '🛡️ Comandos administrativos do grupo — subcomandos: promover, rebaixar, adicionar, remover, ban, todos, contagem, expulsar, link, mute, desmute, lista, mutargrupo, bemvindo, autosticker, inativos, abrir, fechar',
  usage: '*!admin* <subcomando> [args]',

  /**
   * Handler do comando.
   * @param {{ message: any, args: string[], client: any }} ctx
   */
  async execute({ message, args, client }) {
    // Normaliza IDs para formato aceito pela lib.
    // Importante: preserva IDs com domínio (ex.: @lid), pois converter cegamente quebra.
    function toDigitsId(rawId) {
      const s = String(rawId || '').trim()
      if (!s) return null

      // Se já vier com domínio/sufixo (ex.: @c.us, @s.whatsapp.net, @lid), preserve.
      // Converter cegamente quebra IDs do tipo @lid (comuns em contas recentes).
      if (s.includes('@')) return s

      // Se for número “cru”, normaliza para o formato aceito pela lib.
      const digits = s.replace(/\D/g, '')
      return digits ? `${digits}@c.us` : null
    }

    // Obtém alvos a partir de menções ou da mensagem citada (reply).
    async function getTargetIds() {
      let targets = message.mentionedIds || []
      if (targets.length === 0 && message.hasQuotedMsg) {
        const q = await message.getQuotedMessage()
        if (q && q.author) targets = [q.author]
      }
      return targets.map(t => toDigitsId(t) || t).filter(Boolean)
    }

    // Extrai apenas dígitos (útil para comparar números ignorando formatação).
    function digitsOnly(s) {
      return (s || '').toString().replace(/\D/g, '')
    }

    // Tenta obter o ID serializado do próprio bot (para checks no participants).
    function getBotSerializedId() {
      try {
        return (
          (client &&
            client.info &&
            client.info.wid &&
            client.info.wid._serialized) ||
          (client &&
            client.info &&
            client.info.me &&
            client.info.me._serialized) ||
          null
        )
      } catch (e) {
        return null
      }
    }

    // Confere se o bot é admin no chat (quando possível inferir pelo participants).
    function isBotAdminInChat(chat) {
      try {
        const botId = getBotSerializedId()
        if (!botId || !chat || !Array.isArray(chat.participants)) return null

        const found = (chat.participants || []).find(p => {
          const pid = p && p.id && (p.id._serialized || p.id.user)
          const serialized =
            (p && p.id && p.id._serialized) ||
            (typeof pid === 'string' && pid.includes('@') ? pid : null) ||
            (typeof pid === 'string' ? `${pid}@c.us` : null)
          return serialized === botId
        })

        if (!found) return null
        return !!(found.isAdmin || found.isSuperAdmin)
      } catch (e) {
        return null
      }
    }

    // Converte um participantId em uma chave estável para blacklist/stats.
    // Preferência: +<digits>; fallback: id original (ex.: @lid).
    async function computeUserKeyFromId(participantId) {
      try {
        const raw = String(participantId || '').trim()
        if (!raw) return null

        const directDigits = digitsOnly(
          raw.includes('@') ? raw.split('@')[0] : raw
        )
        if (directDigits) return `+${directDigits}`

        // Tentar resolver número real via contato (útil para ids @lid)
        if (client && typeof client.getContactById === 'function') {
          try {
            const c = await client.getContactById(raw)
            const num = digitsOnly((c && c.number) || '')
            if (num) return `+${num}`
            const userDigits = digitsOnly((c && c.id && c.id.user) || '')
            if (userDigits) return `+${userDigits}`
          } catch (e) {
            // ignore
          }
        }

        // Fallback: id estável
        return raw
      } catch (e) {
        return null
      }
    }

    // Leitura/escrita segura do arquivo `blacklist.json`.
    function readBlacklist() {
      const data = readJSON('blacklist.json') || {}
      const out = {
        globalList:
          (data && typeof data.globalList === 'object' && data.globalList) ||
          {},
        banCounts:
          (data && typeof data.banCounts === 'object' && data.banCounts) || {}
      }
      return out
    }

    function writeBlacklist(next) {
      const safe = {
        globalList:
          (next && typeof next.globalList === 'object' && next.globalList) ||
          {},
        banCounts:
          (next && typeof next.banCounts === 'object' && next.banCounts) || {}
      }
      writeJSON('blacklist.json', safe)
    }

    // Faz parse de minutos a partir dos args do subcomando (ex.: mute 10).
    function parseMinutes() {
      // Aceita:
      // - Número puro (minutos): "10" => 10
      // - Sufixo de unidade: "10m", "10min", "2h", "2hora", "2horas"
      // - Unidade separada: "2 h", "10 min"
      // Observação: ignora tokens com números muito longos (ex.: telefones/ids).
      const tokens = (args.slice(1) || [])
        .map(t =>
          String(t || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)

      const isHourUnit = u =>
        ['h', 'hr', 'hrs', 'hora', 'horas'].includes(String(u || ''))
      const isMinuteUnit = u => ['m', 'min', 'mins'].includes(String(u || ''))

      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i]

        // Formato: "2h" | "10min" | "30m" | "15".
        const m = t.match(/^([0-9]{1,6})(h|hr|hrs|hora|horas|m|min|mins)?$/)
        if (m) {
          const n = parseInt(m[1], 10)
          if (!Number.isFinite(n) || n <= 0) continue

          const unit = m[2] || ''
          if (!unit) {
            // Número puro é minutos, mas ignore valores gigantes (provável telefone/id).
            if (n > 1440) continue
            return n
          }

          if (isHourUnit(unit)) {
            const minutes = n * 60
            if (minutes > 1440) continue
            return minutes
          }
          if (isMinuteUnit(unit)) {
            if (n > 1440) continue
            return n
          }
        }

        // Formato: "2" "h" ou "10" "min".
        if (/^[0-9]{1,6}$/.test(t)) {
          const n = parseInt(t, 10)
          if (!Number.isFinite(n) || n <= 0) continue

          const next = tokens[i + 1] || ''
          if (isHourUnit(next)) {
            const minutes = n * 60
            if (minutes > 1440) continue
            return minutes
          }
          if (isMinuteUnit(next)) {
            if (n > 1440) continue
            return n
          }

          // Sem unidade explícita: minutos (ignora valores gigantes).
          if (n > 1440) continue
          return n
        }
      }

      return null
    }

    function formatDurationMinutes(minutes) {
      const n = Number(minutes)
      if (!Number.isFinite(n) || n <= 0) return ''
      if (n % 60 === 0) {
        const h = n / 60
        if (h === 1) return '1 hora'
        return `${h} horas`
      }
      return `${n} min`
    }

    // Confere se o remetente é admin do grupo.
    // Implementa compatibilidade com @lid e com ids serializados.
    async function isSenderAdmin(chat) {
      try {
        let senderId = null
        let senderDigits = ''
        try {
          const contact = await message.getContact()
          if (contact && contact.id && contact.id._serialized)
            senderId = contact.id._serialized
          else if (contact && contact.id && contact.id.user)
            senderId = `${contact.id.user}@c.us`

          // útil quando senderId vier como @lid
          senderDigits = digitsOnly(
            (contact && (contact.number || (contact.id && contact.id.user))) ||
              ''
          )
        } catch (e) {
          senderId = message.author || message.from || null
        }
        senderId = toDigitsId(senderId) || senderId
        if (!senderId) return false

        if (!senderDigits) {
          senderDigits = digitsOnly(String(senderId).split('@')[0])
        }

        const admins = (chat.participants || [])
          .filter(p => p && (p.isAdmin || p.isSuperAdmin))
          .map(p => {
            const pid = p && p.id && (p.id._serialized || p.id.user)
            return toDigitsId(pid) || (p.id && p.id._serialized) || null
          })
          .filter(Boolean)

        if (admins.includes(senderId)) return true

        const adminDigits = admins
          .map(a => digitsOnly(String(a).split('@')[0]))
          .filter(Boolean)

        if (senderDigits && adminDigits.includes(senderDigits)) return true

        const s9 = senderDigits ? senderDigits.slice(-9) : ''
        if (s9) {
          for (const ad of adminDigits) {
            if (ad && ad.slice(-9) === s9) return true
          }
        }

        return false
      } catch (e) {
        return false
      }
    }

    // Roteamento de subcomandos do `!admin`.
    const cmd = (args[0] || '').toLowerCase()
    if (!cmd) {
      const entries = [
        ,
        /*{
          title: '➕ *Adicionar*',
          desc: 'Adiciona um número ao grupo.',
          usage: '*!admin adicionar* 55119xxxxxxx'
        }*/ {
          title: '🗑️ *Banir*',
          desc: 'Remove (banir) um participante do grupo.',
          usage: 'marque ou responda e envie *!admin ban*'
        },
        {
          title: '⬇️ *Rebaixar*',
          desc: 'Remove admin de um participante.',
          usage: 'marque ou responda e envie *!admin rebaixar*'
        },
        {
          title: '📢👥 *MarcarTodos*',
          desc: 'Menciona todos os membros do grupo.',
          usage: '*!admin todos*'
        },
        {
          title: '👤 *MarcarParticipantes*',
          desc: 'Marca apenas participantes comuns.',
          usage: '*!admin marcarparticipantes*'
        },
        {
          title: '🛡️ *MarcarAdmins*',
          desc: 'Marca apenas admins.',
          usage: '*!admin marcaradmins*'
        },
        {
          title: '🔗 *Link*',
          desc: 'Obtém o link de convite do grupo.',
          usage: '*!admin link*'
        },
        {
          title: '🔇 *Mute*',
          desc: 'Coloca um participante de castigo (apaga mensagens por um tempo).',
          usage:
            'marque ou responda e envie *!admin mute* <tempo> (1-1440min ou 1-24h)'
        },
        {
          title: '🔊 *Desmute*',
          desc: 'Remove o castigo de um participante.',
          usage: 'marque ou responda e envie *!admin desmute*'
        },
        ,
        /* {
           title: '👑 *DonoGrupo*',
           desc: 'Mostra o dono do grupo.',
           usage: '*!admin donogrupo*'
         }*/ {
          title: '🚫📛 *Lista*',
          desc: 'Gerencia/mostra a lista (blacklist) global do bot.',
          usage: '*!admin lista*'
        },
        {
          title: '🔕 *MutarGrupo*',
          desc: 'Impede uso de comandos no grupo.',
          usage: '*!admin mutargrupo* (toggle)'
        },
        {
          title: '👋 *BemVindo*',
          desc: 'Ativa/desativa mensagem de boas-vindas.',
          usage: '*!admin bemvindo* on|off'
        },
        {
          title: '🤖🖼️ *AutoSticker*',
          desc: 'Ativa stickers automáticos no grupo.',
          usage: '*!admin autosticker* on|off'
        },
        // AntiFake / AntiLink / AntiFlood: em standby (comentado no código)
        {
          title: '🚫📝 *Filtro*',
          desc: 'Gerencia filtro de palavras proibidas.',
          usage: '*!admin filtro* add|remove <palavra>'
        },
        {
          title: '⚠️ *Avisos*',
          desc: 'Configura sistema de avisos (ex: 3 avisos -> ban).',
          usage: '*!admin avisos* <n>'
        },
        {
          title: '📊 *Contagem / Ranking*',
          desc: 'Contagem de mensagens e ranking de membros.',
          usage: '*!admin contagem* | *!admin ranking*'
        },
        {
          title: '🚪 *Expulsar Inativos*',
          desc: 'Expulsa participantes sem comunicação por 48 horas.',
          usage: '*!admin expulsar*'
        },
        {
          title: '🤖🚪 *ExpulsarAuto (48h)*',
          desc: 'Ativa expulsão automática de não-admins inativos por 48 horas.',
          usage: '*!admin expulsarauto* on|off'
        },
        {
          title: '💤 *Inativos*',
          desc: 'Marca membros inativos.',
          usage: '*!admin inativos* <dias>'
        },
        {
          title: '⛔ *BloquearCmd*',
          desc: 'Bloqueia comandos neste grupo.',
          usage: '*!admin bloquearcmd* <comando> on|off'
        },
        {
          title: '🧹 *Apagar*',
          desc: 'Apaga mensagens (requer admin).',
          usage: '*!admin apagar* <n>'
        },
        {
          title: '🔓/🔒 *Abrir / Fechar*',
          desc: 'Alterna permissão para mensagens de não-admins.',
          usage: '*!admin abrir* | *!admin fechar*'
        }
      ]

      const validEntries = entries.filter(
        e => e && e.title && e.desc && e.usage
      )

      const header = [
        '*🛡️ Admin do Grupo*',
        'Use: *!admin* <subcomando> [args]'
      ]
      const blocks = validEntries.map(e => {
        return [`${e.title}`, `• ${e.desc}`, `• Uso: ${e.usage}`].join('\n')
      })

      // Espaço entre opções: um bloco por entrada, separado por linha em branco.
      await message.reply([...header, '', ...blocks].join('\n\n').trim())
      return
    }

    switch (cmd) {
      case 'mute': {
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const isAdmin = await isSenderAdmin(chat)
        if (!isAdmin)
          return await message.reply(
            'Apenas administradores podem usar este comando.'
          )

        const botAdmin = isBotAdminInChat(chat)
        if (botAdmin === false) {
          return await message.reply(
            '⚠️ Para o castigo funcionar (apagar mensagens), o bot precisa ser *admin* no grupo. Promova o bot e tente novamente.'
          )
        }

        const minutes = parseMinutes()
        if (!minutes || minutes < 1 || minutes > 1440)
          return await message.reply(
            'Uso: marque/responda e envie *!admin mute* <tempo> (1-1440min ou 1-24h)\nEx.: *!admin mute 90* | *!admin mute 2h*'
          )

        const targets = await getTargetIds()
        if (targets.length === 0)
          return await message.reply(
            'Marque ou responda a mensagem do usuário para mutar.'
          )

        const mutes = readJSON('mutes.json') || {}
        const chatId = message.from || message.author || ''
        mutes[chatId] = mutes[chatId] || {}

        const expiresAt = Date.now() + minutes * 60 * 1000
        for (const t of targets) {
          const tid = toDigitsId(t) || t
          if (!tid) continue

          // Salvar chaves alternativas para evitar quebra com IDs @lid.
          const d = digitsOnly(String(tid).split('@')[0])
          const phoneKey = d ? `+${d}` : null
          const cUsKey = d ? `${d}@c.us` : null

          mutes[chatId][tid] = expiresAt
          if (phoneKey) mutes[chatId][phoneKey] = expiresAt
          if (cUsKey) mutes[chatId][cUsKey] = expiresAt
        }
        writeJSON('mutes.json', mutes)

        await message.reply(
          `✅ Castigo aplicado por ${formatDurationMinutes(minutes)}.`
        )
        break
      }
      case 'desmute': {
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const isAdmin = await isSenderAdmin(chat)
        if (!isAdmin)
          return await message.reply(
            'Apenas administradores podem usar este comando.'
          )

        const targets = await getTargetIds()
        if (targets.length === 0)
          return await message.reply(
            'Marque ou responda a mensagem do usuário para desmutar.'
          )

        const mutes = readJSON('mutes.json') || {}
        const chatId = message.from || message.author || ''
        if (!mutes[chatId]) mutes[chatId] = {}

        for (const t of targets) {
          const tid = toDigitsId(t) || t
          if (!tid) continue

          const d = digitsOnly(String(tid).split('@')[0])
          const phoneKey = d ? `+${d}` : null
          const cUsKey = d ? `${d}@c.us` : null

          delete mutes[chatId][tid]
          if (phoneKey) delete mutes[chatId][phoneKey]
          if (cUsKey) delete mutes[chatId][cUsKey]
        }
        writeJSON('mutes.json', mutes)

        await message.reply('✅ Castigo removido.')
        break
      }
      case 'banir':
      case 'ban': {
        const mentioned = message.mentionedIds || []
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )
        let targets = mentioned
        if (targets.length === 0 && message.hasQuotedMsg) {
          const quoted = await message.getQuotedMessage()
          if (quoted && quoted.author) targets = [quoted.author]
        }
        if (targets.length === 0)
          return await message.reply(
            'Marque ou selecione a mensagem do usuário que deseja banir.'
          )
        try {
          await chat.removeParticipants(targets)

          // contar bans globalmente e auto-incluir na lista após 3 bans
          const bl = readBlacklist()
          let autoAdded = []
          for (const t of targets) {
            const key = await computeUserKeyFromId(t)
            if (!key) continue
            const prev = Number(bl.banCounts[key]) || 0
            const next = prev + 1
            bl.banCounts[key] = next

            if (next >= 3 && !bl.globalList[key]) {
              bl.globalList[key] = {
                addedAt: new Date().toISOString(),
                reason: 'auto-3-bans',
                bans: next
              }
              autoAdded.push(key)
            } else if (bl.globalList[key]) {
              // manter bans atualizado também na lista
              try {
                bl.globalList[key].bans = next
              } catch (e) {
                // ignore
              }
            }
          }
          writeBlacklist(bl)

          const extra =
            autoAdded.length > 0
              ? `\n\n🚫 Adicionado automaticamente à *!admin lista* após 3 bans:\n- ${autoAdded.join(
                  '\n- '
                )}`
              : ''
          await message.reply(`Usuário(s) banido(s) do grupo!${extra}`)
        } catch (e) {
          await message.reply(
            'Erro ao banir participante. Certifique-se de ser admin.'
          )
        }
        break
      }
      case 'todos': {
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )
        const participants = chat.participants || []
        if (participants.length === 0)
          return await message.reply('Nenhum participante encontrado.')
        const mentionIdsRaw = participants
          .map(p => {
            try {
              if (!p) return null
              if (p.id && p.id._serialized) return p.id._serialized
              if (p.id && typeof p.id === 'string') return p.id
              if (p._serialized) return p._serialized
              if (p.id && p.id.user) return `${String(p.id.user)}@c.us`
              return null
            } catch (e) {
              return null
            }
          })
          .filter(Boolean)

        const mentionIds = [...new Set(mentionIdsRaw)]

        // Tenta resolver contatos (melhor compatibilidade com menções).
        // Se falhar, usa IDs diretamente (já usado em outros pontos do projeto).
        let mentionEntities = mentionIds
        try {
          if (client && typeof client.getContactById === 'function') {
            const contacts = (
              await Promise.all(
                mentionIds.map(async id => {
                  try {
                    return await client.getContactById(id)
                  } catch (e) {
                    return null
                  }
                })
              )
            ).filter(Boolean)
            if (contacts.length > 0) mentionEntities = contacts
          }
        } catch (e) {
          // ignore
        }

        const mentionText = mentionIds
          .map(id => {
            try {
              const raw = String(id || '')
                .split('@')[0]
                .trim()
              return raw ? `@${raw}` : ''
            } catch (e) {
              return ''
            }
          })
          .filter(Boolean)
          .join(' ')

        await chat.sendMessage(`Marcando todos:\n${mentionText}`, {
          mentions: mentionEntities
        })
        break
      }
      case 'promover': {
        const mentioned = message.mentionedIds || []
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )
        let targets = mentioned
        if (targets.length === 0 && message.hasQuotedMsg) {
          const quoted = await message.getQuotedMessage()
          if (quoted && quoted.author) targets = [quoted.author]
        }
        if (targets.length === 0)
          return await message.reply(
            'Marque ou selecione a mensagem do usuário que deseja promover.'
          )
        try {
          await chat.promoteParticipants(targets)
          await message.reply('Usuário(s) promovido(s) a admin!')
        } catch (e) {
          await message.reply(
            'Erro ao promover participante. Certifique-se de ser admin.'
          )
        }
        break
      }
      case 'rebaixar': {
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const isAdmin = await isSenderAdmin(chat)
        if (!isAdmin)
          return await message.reply(
            'Apenas administradores podem usar este comando.'
          )

        const targets = await getTargetIds()
        if (targets.length === 0)
          return await message.reply(
            'Marque ou responda a mensagem do usuário que deseja rebaixar.'
          )

        // Mapear ids para o formato correto e validar se é admin / dono
        const wanted = targets.map(t => toDigitsId(t) || t).filter(Boolean)
        const participants = chat.participants || []
        const normalizedParticipants = participants
          .map(p => {
            const pid =
              (p && p.id && (p.id._serialized || p.id.user)) ||
              (p && p.id && p.id._serialized) ||
              null
            const did =
              toDigitsId(pid) || (p && p.id && p.id._serialized) || null
            return { p, id: did }
          })
          .filter(x => x.id)

        const toDemote = []
        const cant = []

        for (const id of wanted) {
          const found = normalizedParticipants.find(x => x.id === id)
          const p = found && found.p

          // Se não achar no cache, tenta mesmo assim (às vezes a lista não vem completa)
          if (!p) {
            toDemote.push(id)
            continue
          }

          if (p.isSuperAdmin) {
            cant.push(`@${id.split('@')[0]} (dono/superadmin)`)
            continue
          }
          if (!p.isAdmin) {
            cant.push(`@${id.split('@')[0]} (já não é admin)`)
            continue
          }

          toDemote.push(id)
        }

        if (toDemote.length === 0) {
          if (cant.length > 0) {
            return await message.reply(
              `Não foi possível rebaixar:\n- ${cant.join('\n- ')}`
            )
          }
          return await message.reply(
            'Não encontrei ninguém elegível para rebaixar.'
          )
        }

        try {
          await chat.demoteParticipants(toDemote)

          // Confirmar resultado (às vezes o WhatsApp ignora sem erro)
          await new Promise(r => setTimeout(r, 900))
          let refreshed = null
          try {
            const chatId =
              (chat && chat.id && chat.id._serialized) || message.from || null
            if (chatId && client && typeof client.getChatById === 'function') {
              refreshed = await client.getChatById(chatId)
            }
          } catch (e) {
            refreshed = null
          }
          const checkChat = refreshed || chat
          const refreshedAdmins = (checkChat.participants || [])
            .filter(p => p && (p.isAdmin || p.isSuperAdmin))
            .map(p => {
              const pid = p && p.id && (p.id._serialized || p.id.user)
              return toDigitsId(pid) || (p.id && p.id._serialized) || null
            })
            .filter(Boolean)

          const stillAdmin = toDemote.filter(id => refreshedAdmins.includes(id))

          if (stillAdmin.length > 0) {
            const still = stillAdmin.map(id => `@${id.split('@')[0]}`).join(' ')
            const cantMsg =
              cant.length > 0 ? `\n\nObs:\n- ${cant.join('\n- ')}` : ''
            return await message.reply(
              `Não consegui rebaixar: ${still}\nProvável dono/superadmin ou falta de permissão do WhatsApp.${cantMsg}`
            )
          }

          if (cant.length > 0) {
            return await message.reply(
              `✅ Rebaixado com sucesso!\n\nObs:\n- ${cant.join('\n- ')}`
            )
          }

          await message.reply('✅ Admin removido com sucesso!')
        } catch (e) {
          await message.reply(
            'Erro ao rebaixar participante. Certifique-se de que o bot é admin e que o alvo não é o dono do grupo.'
          )
        }
        break
      }
      case 'marcarparticipantes':
        await message.reply(
          'Função de marcar participantes ainda não implementada.'
        )
        break
      case 'link': {
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )
        try {
          let link = null
          // tenta métodos disponíveis em diferentes versões da lib
          if (chat && typeof chat.getInviteCode === 'function') {
            try {
              const code = await chat.getInviteCode()
              if (code) link = `https://chat.whatsapp.com/${code}`
            } catch (e) {
              // ignore e tente outras formas
            }
          }
          if (!link && chat && typeof chat.getInviteLink === 'function') {
            try {
              link = await chat.getInviteLink()
            } catch (e) {
              // ignore
            }
          }
          if (!link && chat && chat.inviteCode) {
            link = `https://chat.whatsapp.com/${chat.inviteCode}`
          }
          if (!link) {
            return await message.reply(
              'Não foi possível obter o link do grupo. Verifique se o bot é admin ou tente *!admin resetlink*.'
            )
          }
          await message.reply(`Link do grupo: ${link}`)
        } catch (e) {
          await message.reply(
            'Erro ao obter link do grupo: ' + (e && e.message)
          )
        }
        break
      }
      case 'marcaradmins':
        await message.reply('Função de marcar admins ainda não implementada.')
        break
      case 'linkgrupo':
        await message.reply(
          'Função de obter link do grupo ainda não implementada.'
        )
        break
      case 'resetlink':
        await message.reply(
          'Função de redefinir link do grupo ainda não implementada.'
        )
        break
      case 'donogrupo':
        await message.reply('Função de dono do grupo ainda não implementada.')
        break
      case 'listanegra':
      case 'lista': {
        const sub = (args[1] || '').toLowerCase()

        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const isAdmin = await isSenderAdmin(chat)
        if (!isAdmin)
          return await message.reply(
            'Apenas administradores podem usar este comando.'
          )

        const bl = readBlacklist()

        // Resolve alvos para lista: menção/reply ou número informado.
        async function resolveTargetsFromArgs() {
          const fromMentions = await getTargetIds()
          if (fromMentions.length > 0) return fromMentions

          // fallback: número em args[2]
          const raw = args[2] || ''
          const dig = digitsOnly(raw)
          if (dig) return [`${dig}@c.us`]
          return []
        }

        if (sub === 'add' || sub === 'adicionar') {
          const targets = await resolveTargetsFromArgs()
          if (targets.length === 0)
            return await message.reply(
              'Uso: marque/responda e envie *!admin lista add* [motivo opcional]'
            )

          const reason = args.slice(2).join(' ').trim() || 'manual'
          const added = []
          for (const t of targets) {
            const key = await computeUserKeyFromId(t)
            if (!key) continue
            bl.globalList[key] = {
              addedAt: new Date().toISOString(),
              reason,
              bans: Number(bl.banCounts[key]) || 0
            }
            added.push(key)
          }
          writeBlacklist(bl)
          return await message.reply(
            added.length > 0
              ? `✅ Adicionado na lista:\n- ${added.join('\n- ')}`
              : 'Não consegui adicionar. Tente marcar ou responder o usuário.'
          )
        }

        if (sub === 'rm' || sub === 'remove' || sub === 'remover') {
          const targets = await resolveTargetsFromArgs()
          if (targets.length === 0)
            return await message.reply(
              'Uso: marque/responda e envie *!admin lista remover*'
            )

          const removed = []
          for (const t of targets) {
            const key = await computeUserKeyFromId(t)
            if (!key) continue
            if (bl.globalList[key]) {
              delete bl.globalList[key]
              removed.push(key)
            }
          }
          writeBlacklist(bl)
          return await message.reply(
            removed.length > 0
              ? `✅ Removido da lista:\n- ${removed.join('\n- ')}`
              : 'Ninguém dos alvos estava na lista.'
          )
        }

        if (sub === 'limpar' || sub === 'clear') {
          bl.globalList = {}
          writeBlacklist(bl)
          return await message.reply('✅ Lista limpa (global).')
        }

        const items = Object.entries(bl.globalList || {})
        if (items.length === 0) {
          return await message.reply(
            '📛 Lista (global): *vazia*\n\nUse: *!admin lista add* (marcando/respondendo)'
          )
        }

        const lines = items
          .sort((a, b) => {
            const ab = Number((a[1] && a[1].bans) || 0)
            const bb = Number((b[1] && b[1].bans) || 0)
            return bb - ab
          })
          .slice(0, 50)
          .map(([key, meta]) => {
            const bans = Number((meta && meta.bans) || bl.banCounts[key] || 0)
            const why = (meta && meta.reason) || 'manual'
            return `- ${key} (bans: ${bans}, motivo: ${why})`
          })

        return await message.reply(
          `📛 Lista (global) — ${items.length} item(ns)\n\n${lines.join(
            '\n'
          )}\n\nDica: ao banir o mesmo número 3x, ele entra automaticamente na lista.`
        )
      }
      case 'mutargrupo': {
        const sub = args[1] ? args[1].toLowerCase() : ''
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const isAdmin = await isSenderAdmin(chat)
        if (!isAdmin)
          return await message.reply(
            'Apenas administradores podem usar este comando.'
          )

        const settings = readJSON('groupSettings.json') || {}
        const chatId = message.from || message.author || ''
        settings[chatId] = settings[chatId] || {}

        // toggle por padrão; mantém compatibilidade com on/off
        const curEnabled =
          settings[chatId].mutargrupo &&
          settings[chatId].mutargrupo.enabled === true

        let nextEnabled = !curEnabled
        if (sub === 'on') nextEnabled = true
        if (sub === 'off') nextEnabled = false

        settings[chatId].mutargrupo = { enabled: nextEnabled }
        writeJSON('groupSettings.json', settings)

        return await message.reply(
          nextEnabled
            ? '🔕 Comandos mutados neste grupo (somente admins).'
            : '🔔 Comandos desmutados neste grupo.'
        )
      }
      case 'bemvindo': {
        const sub = args[1] ? args[1].toLowerCase() : ''
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        // carregar configurações de grupos
        const settings = readJSON('groupSettings.json') || {}
        const chatId = message.from || message.author || ''

        // mensagem padrão solicitada
        const defaultMsg =
          '✨ *BEM-VINDO(A) A SOCIEDADE DO CAOS*!\n\n💃 *APRESENTAÇÃO* 🕺:\n\n📸 *FOTO*:\n\n✅ *NOME*:\n\n🔞 *IDADE*:\n\n☄️ *SIGNO*:\n\n👅*ORIENTAÇÃO SEXUAL*:Hétero, gay, bi, etc.\n\n❤️ *ESTADO CIVIL*: Solteiro, namorando, casado e/ou outros\n\n🏡 *BAIRRO OU CIDADE*:\n\n📷 *INSTAGRAM*:\n\n✨ *TIPO DE ROLÊ PREFERIDO*:\n\n\n\n\n*Não apresentação ou interação sujeita a remoção do grupo*\n\nGentileza ler as regras do grupo. Comando: !regras'

        if (sub === 'on') {
          settings[chatId] = settings[chatId] || {}
          settings[chatId].bemvindo = {
            enabled: true,
            message: defaultMsg
          }
          writeJSON('groupSettings.json', settings)
          await message.reply(
            '✅ Mensagem de boas-vindas ativada para este grupo.'
          )
          return
        }

        if (sub === 'off') {
          settings[chatId] = settings[chatId] || {}
          settings[chatId].bemvindo = { enabled: false, message: defaultMsg }
          writeJSON('groupSettings.json', settings)
          await message.reply(
            '✅ Mensagem de boas-vindas desativada para este grupo.'
          )
          return
        }

        // mostrar estado atual
        const cur = (settings[chatId] && settings[chatId].bemvindo) || null
        const status = cur && cur.enabled ? 'Ativado' : 'Desativado'
        const msgShow = cur && cur.message ? cur.message : defaultMsg
        await message.reply(
          `Bem-vindo: *${status}*\nID do grupo: ${chatId}\nMensagem:\n${msgShow}\n\nUse *!admin bemvindo on* ou *!admin bemvindo off*`
        )
        break
      }
      case 'autosticker': {
        const sub = args[1] ? args[1].toLowerCase() : ''
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const isAdmin = await isSenderAdmin(chat)
        if (!isAdmin)
          return await message.reply(
            'Apenas administradores podem usar este comando.'
          )

        const settings = readJSON('groupSettings.json') || {}
        const chatId = message.from || message.author || ''
        settings[chatId] = settings[chatId] || {}

        const curEnabled =
          settings[chatId].autosticker &&
          settings[chatId].autosticker.enabled === true

        if (sub === 'on') {
          settings[chatId].autosticker = { enabled: true }
          writeJSON('groupSettings.json', settings)
          return await message.reply('✅ AutoSticker ativado neste grupo.')
        }
        if (sub === 'off') {
          settings[chatId].autosticker = { enabled: false }
          writeJSON('groupSettings.json', settings)
          return await message.reply('✅ AutoSticker desativado neste grupo.')
        }

        return await message.reply(
          `AutoSticker: *${curEnabled ? 'Ativado' : 'Desativado'}*\nUse *!admin autosticker on* ou *!admin autosticker off*`
        )
      }

      /*
      // AntiFake / AntiLink / AntiFlood: standby
      case 'antifake':
      case 'antilink':
      case 'antiflood':
        await message.reply('Estas proteções estão em standby no momento.')
        break
      */
      case 'filtro':
        await message.reply(
          'Função de filtro de palavras proibidas ainda não implementada.'
        )
        break
      case 'avisos':
        await message.reply(
          'Função de sistema de avisos ainda não implementada.'
        )
        break
      case 'contagem': {
        // subcomando: zerar | expulsar
        const sub = args[1] ? args[1].toLowerCase() : ''
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        // carregar entrada do grupo
        const stats = readJSON('stats.json') || {}
        const chatId = message.from || message.author || ''
        const entry = stats[chatId]
        if (!entry && sub !== 'zerar')
          return await message.reply(
            'Sem dados de contagem para este grupo ainda.'
          )

        if (sub === 'zerar' || sub === 'reset') {
          const participants = chat.participants || []
          const usersMap = {}
          for (const p of participants) {
            try {
              const pid =
                (p && p.id && (p.id._serialized || p.id.user)) ||
                (p && p._serialized) ||
                null
              if (!pid) continue
              let num = String(p.id && p.id.user ? p.id.user : '').trim()
              num = num.replace(/\D/g, '')

              if (
                !num &&
                client &&
                typeof client.getContactById === 'function'
              ) {
                try {
                  const c = await client.getContactById(pid)
                  num = String((c && c.number) || '').replace(/\D/g, '')
                } catch (e) {
                  num = ''
                }
              }

              if (!num) continue
              const key = num.startsWith('+') ? num : `+${num}`
              usersMap[key] = 0
            } catch (e) {
              // ignore
            }
          }
          stats[chatId] = {
            total: 0,
            users: usersMap,
            lasts: {},
            joins: {},
            baselines: {}
          }
          writeJSON('stats.json', stats)
          return await message.reply(
            '✅ Contagens zeradas para todos os participantes deste grupo.'
          )
        }

        // exibir contagem/ranking
        const users = (entry && entry.users) || {}
        const lasts = (entry && entry.lasts) || {}
        const joins = (entry && entry.joins) || {}
        const baselines = (entry && entry.baselines) || {}

        // mapear participantes
        const participants = chat.participants || []
        const participantNumbers = (
          await Promise.all(
            participants.map(async p => {
              try {
                const pid =
                  (p && p.id && (p.id._serialized || p.id.user)) ||
                  (p && p._serialized) ||
                  null
                if (!pid) return null

                let num = String(p.id && p.id.user ? p.id.user : '').trim()
                num = num.replace(/\D/g, '')

                if (
                  !num &&
                  client &&
                  typeof client.getContactById === 'function'
                ) {
                  try {
                    const c = await client.getContactById(pid)
                    num = String((c && c.number) || '').replace(/\D/g, '')
                  } catch (e) {
                    num = ''
                  }
                }

                if (num) return num.startsWith('+') ? num : `+${num}`
                return null
              } catch (e) {
                return null
              }
            })
          )
        ).filter(Boolean)

        const combined = {}
        const mappedKeys = new Set()

        // Helpers locais para mapear participant -> chave do stats (com tolerância de sufixo).
        function digits(s) {
          return (s || '').toString().replace(/\D/g, '')
        }

        // Procura a chave mais adequada em `users/lasts/joins` para um participante.
        function findUserKeyForParticipant(partNum) {
          const p = digits(partNum)
          const direct = `+${p}`
          const candidateKeys = new Set([
            ...Object.keys(users || {}),
            ...Object.keys(lasts || {}),
            ...Object.keys(joins || {})
          ])
          if (candidateKeys.has(direct)) return direct
          const suf = p.slice(-9)
          for (const k of candidateKeys) {
            const kd = digits(k)
            if (!kd) continue
            if (kd.endsWith(suf) || p.endsWith(kd.slice(-9))) return k
          }
          return null
        }

        // Parse robusto de timestamps (ISO string ou número).
        function parseTime(v) {
          if (!v) return null
          if (typeof v === 'number' && Number.isFinite(v)) return v
          const t = Date.parse(String(v))
          return Number.isNaN(t) ? null : t
        }

        for (const num of participantNumbers) {
          const display = num.replace(/^\+/, '')
          const foundKey = findUserKeyForParticipant(num)
          if (foundKey) {
            const rawCount = Number(users[foundKey]) || 0
            const base = Number(baselines[foundKey]) || 0
            const count = Math.max(0, rawCount - base)
            const lastMsg = lasts[foundKey] || null
            const joinAt = joins[foundKey] || null
            const lastActivity = Math.max(
              parseTime(lastMsg) || 0,
              parseTime(joinAt) || 0
            )
            combined[display] = {
              count,
              last: lastActivity ? new Date(lastActivity).toISOString() : null,
              lastSource: lastMsg ? 'msg' : joinAt ? 'join' : null
            }
            mappedKeys.add(foundKey)
          } else {
            combined[display] = { count: 0, last: null }
          }
        }
        const sorted = Object.keys(combined).sort(
          (a, b) => combined[b].count - combined[a].count
        )

        const totalSinceJoin = Object.keys(combined).reduce((acc, k) => {
          const v = combined[k]
          const c = v && typeof v === 'object' ? Number(v.count) || 0 : 0
          return acc + c
        }, 0)

        let msg = `📊 Contagem de mensagens — total do grupo: *${totalSinceJoin}*\n\n`
        for (const displayNum of sorted) {
          const item = combined[displayNum]
          const cnt = item && typeof item === 'object' ? item.count : item
          const last = item && item.last ? item.last : null
          const src = item && item.lastSource ? item.lastSource : null
          let lastStr = ''
          if (last) {
            try {
              const label = src === 'join' ? 'entrada' : 'última'
              lastStr = ` (${label}: ${new Date(last).toLocaleString('pt-BR')})`
            } catch (e) {
              lastStr = ` (última: ${last})`
            }
          }
          msg += `- ${displayNum}: ${cnt}${lastStr}\n`
        }

        msg += `\nParticipantes do grupo: *${participantNumbers.length}*`

        await message.reply(msg)
        break
      }
      case 'expulsarauto': {
        const sub = args[1] ? args[1].toLowerCase() : ''
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const isAdmin = await isSenderAdmin(chat)
        if (!isAdmin)
          return await message.reply(
            'Apenas administradores podem usar este comando.'
          )

        const settings = readJSON('groupSettings.json') || {}
        const chatId = message.from || message.author || ''
        settings[chatId] = settings[chatId] || {}

        // Parseia duração em args para configurar limite de inatividade.
        // Formatos aceitos: "5m", "48h", "2d", "120s" (normaliza para minutes/hours).
        function parseDurationToConfig(raw) {
          const s = String(raw || '')
            .trim()
            .toLowerCase()
          if (!s) return null

          const m = s.match(
            /^(\d{1,6})(ms|s|sec|secs|m|min|mins|h|hr|hrs|d)?$/i
          )
          if (!m) return null
          const n = Number(m[1])
          if (!Number.isFinite(n) || n <= 0) return null

          const unit = (m[2] || 'm').toLowerCase()
          if (unit === 'ms')
            return { minutes: Math.max(1, Math.round(n / 60000)) }
          if (unit === 's' || unit === 'sec' || unit === 'secs')
            return { minutes: Math.max(1, Math.round(n / 60)) }
          if (unit === 'm' || unit === 'min' || unit === 'mins')
            return { minutes: Math.round(n) }
          if (unit === 'h' || unit === 'hr' || unit === 'hrs')
            return { hours: Math.round(n) }
          if (unit === 'd') return { hours: Math.round(n * 24) }
          return null
        }

        // Formata o limite configurado para exibição.
        function formatLimit(cfg) {
          const c = cfg || {}
          const minutes = Number(c.minutes)
          if (Number.isFinite(minutes) && minutes > 0) return `${minutes} min`
          const hours = Number(c.hours)
          if (Number.isFinite(hours) && hours > 0) return `${hours}h`
          return '48h'
        }

        if (sub === 'on') {
          const prev = settings[chatId].expulsarauto || {}
          const parsed = parseDurationToConfig(args[2])
          // Se não passar duração, mantém a anterior; senão, default 48h.
          const durationCfg =
            parsed ||
            (prev.minutes || prev.hours
              ? { minutes: prev.minutes, hours: prev.hours }
              : { hours: 48 })

          // Normalize: evitar guardar minutes e hours ao mesmo tempo
          const normalized = durationCfg.minutes
            ? { enabled: true, minutes: Number(durationCfg.minutes) }
            : { enabled: true, hours: Number(durationCfg.hours) || 48 }

          settings[chatId].expulsarauto = normalized
          writeJSON('groupSettings.json', settings)

          // Baseline: registrar "entrada" agora para participantes atuais.
          // Isso permite expulsar automaticamente quem nunca fala após ativar.
          try {
            const stats = readJSON('stats.json') || {}
            stats[chatId] = stats[chatId] || {
              total: 0,
              users: {},
              lasts: {},
              joins: {}
            }
            stats[chatId].joins = stats[chatId].joins || {}

            const nowIso = new Date().toISOString()
            const participants = chat.participants || []

            // Helpers locais para seed do baseline (joins) ao ativar expulsarauto.
            function digitsOnly(s) {
              return (s || '').toString().replace(/\D/g, '')
            }

            // Resolve número real por participante (lida com @lid via getContactById).
            async function resolvePhoneDigitsFromParticipant(p) {
              try {
                const direct = digitsOnly((p && p.id && p.id.user) || '')
                if (direct) return direct

                const serialized =
                  (p && p.id && p.id._serialized) ||
                  (p && p.id && typeof p.id === 'string' ? p.id : null)
                if (!serialized) return null

                if (client && typeof client.getContactById === 'function') {
                  try {
                    const c = await client.getContactById(serialized)
                    const byNumber = digitsOnly((c && c.number) || '')
                    if (byNumber) return byNumber
                    const byUser = digitsOnly((c && c.id && c.id.user) || '')
                    if (byUser) return byUser
                  } catch (e) {
                    return null
                  }
                }
                return null
              } catch (e) {
                return null
              }
            }

            let seeded = 0
            for (const p of participants) {
              if (!p) continue
              // admins não serão expulsos, mas não custa registrar também
              const num = await resolvePhoneDigitsFromParticipant(p)
              if (!num) continue
              const key = `+${num}`
              if (!stats[chatId].joins[key]) {
                stats[chatId].joins[key] = nowIso
                seeded++
              }
            }
            writeJSON('stats.json', stats)

            const limit = formatLimit(normalized)
            return await message.reply(
              `✅ Expulsão automática ativada: não-admins sem atividade por *${limit}* serão removidos.\nBaseline criado para ${seeded} participante(s) (conta ${limit} a partir de agora para quem não tem histórico).`
            )
          } catch (e) {
            const curCfg = settings[chatId] && settings[chatId].expulsarauto
            const limit = formatLimit(curCfg)
            return await message.reply(
              `✅ Expulsão automática ativada: não-admins sem atividade por *${limit}* serão removidos.`
            )
          }
        }

        if (sub === 'off') {
          const prev = settings[chatId].expulsarauto || {}
          // Mantém o limite configurado, apenas desativa.
          settings[chatId].expulsarauto = {
            enabled: false,
            ...(prev.minutes
              ? { minutes: prev.minutes }
              : { hours: prev.hours || 48 })
          }
          writeJSON('groupSettings.json', settings)
          return await message.reply('✅ Expulsão automática desativada.')
        }

        const cur = settings[chatId].expulsarauto
        const status = cur && cur.enabled ? 'Ativado' : 'Desativado'
        const limit = formatLimit(cur)
        return await message.reply(
          `ExpulsarAuto: *${status}* (limite: ${limit})\nUse *!admin expulsarauto on* [5m|48h] ou *!admin expulsarauto off*`
        )
      }
      case 'expulsar': {
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const isAdmin = await isSenderAdmin(chat)
        if (!isAdmin)
          return await message.reply(
            'Apenas administradores podem usar este comando.'
          )

        const chatId = message.from || message.author || ''
        const stats = readJSON('stats.json') || {}
        const entry = stats[chatId] || {}
        const lasts = entry.lasts || {}
        const joins = entry.joins || {}

        const cutoff = Date.now() - 48 * 60 * 60 * 1000

        // Helpers de busca no stats para expulsar inativos.
        function digitsOnly(s) {
          return (s || '').toString().replace(/\D/g, '')
        }
        // Parse robusto de timestamps do stats.
        function parseTime(v) {
          if (!v) return null
          if (typeof v === 'number' && Number.isFinite(v)) return v
          const t = Date.parse(String(v))
          return Number.isNaN(t) ? null : t
        }

        const candidateKeys = new Set([
          ...Object.keys(lasts || {}),
          ...Object.keys(joins || {})
        ])

        function findBestKeyForDigits(participantDigits) {
          if (!participantDigits) return null
          const direct = `+${participantDigits}`
          if (candidateKeys.has(direct)) return direct
          const suf = participantDigits.slice(-9)
          for (const k of candidateKeys) {
            const kd = digitsOnly(k)
            if (!kd) continue
            if (kd.endsWith(suf) || participantDigits.endsWith(kd.slice(-9)))
              return k
          }
          return null
        }

        const participants = chat.participants || []
        const toRemove = []

        for (const p of participants) {
          if (!p || p.isAdmin || p.isSuperAdmin) continue
          const serialized = p && p.id && p.id._serialized
          if (!serialized) continue

          const pDigits = digitsOnly(
            (p && p.id && p.id.user) || String(serialized).split('@')[0]
          )
          const key = findBestKeyForDigits(pDigits)
          if (!key) continue

          const lastMsgAt = parseTime(lasts[key])
          const joinAt = parseTime(joins[key])
          const lastActivity = Math.max(lastMsgAt || 0, joinAt || 0)
          if (!lastActivity) continue

          if (lastActivity <= cutoff) toRemove.push(serialized)
        }

        if (toRemove.length === 0) {
          return await message.reply(
            'Nenhum não-admin está inativo há 48h (com histórico conhecido) para expulsar.'
          )
        }

        try {
          await chat.removeParticipants(toRemove)
          return await message.reply(
            `✅ Expulsei ${toRemove.length} participante(s) não-admin por inatividade (48h).`
          )
        } catch (e) {
          return await message.reply(
            'Não consegui expulsar. Verifique se o bot é admin e se tem permissão para remover participantes.'
          )
        }
      }
      case 'ranking':
        await message.reply(
          'Função de ranking dos membros ainda não implementada.'
        )
        break
      case 'inativos': {
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const isAdmin = await isSenderAdmin(chat)
        if (!isAdmin)
          return await message.reply(
            'Apenas administradores podem usar este comando.'
          )

        const days = (() => {
          const raw = args[1]
          const n = parseInt(String(raw || '').replace(/\D/g, ''), 10)
          return Number.isFinite(n) && n > 0 ? n : null
        })()

        if (!days) return await message.reply('Uso: *!admin inativos* <dias>')

        const chatId = message.from || message.author || ''
        const stats = readJSON('stats.json') || {}
        const entry = stats[chatId] || {}
        const lasts = entry.lasts || {}
        const joins = entry.joins || {}

        // Helpers de mapeamento participant -> chave no stats.
        function digits(s) {
          return (s || '').toString().replace(/\D/g, '')
        }

        // Parse robusto de timestamps do stats.
        function parseTime(v) {
          if (!v) return null
          if (typeof v === 'number' && Number.isFinite(v)) return v
          const t = Date.parse(String(v))
          return Number.isNaN(t) ? null : t
        }

        const candidateKeys = new Set([
          ...Object.keys(lasts || {}),
          ...Object.keys(joins || {})
        ])

        function findUserKeyForParticipant(partNum) {
          const p = digits(partNum)
          const direct = `+${p}`
          if (candidateKeys.has(direct)) return direct
          const suf = p.slice(-9)
          for (const k of candidateKeys) {
            const kd = digits(k)
            if (!kd) continue
            if (kd.endsWith(suf) || p.endsWith(kd.slice(-9))) return k
          }
          return null
        }

        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000

        const participants = chat.participants || []
        const participantNumbers = participants
          .map(p => (p.id && p.id.user) || null)
          .filter(Boolean)

        const inactive = []
        const unknown = []

        for (const num of participantNumbers) {
          const display = num.replace(/^\+/, '')
          const k = findUserKeyForParticipant(num)
          if (!k) {
            unknown.push(display)
            continue
          }

          const lastMsgAt = parseTime(lasts[k])
          const joinAt = parseTime(joins[k])
          const lastActivity = Math.max(lastMsgAt || 0, joinAt || 0)
          if (!lastActivity) {
            unknown.push(display)
            continue
          }

          if (lastActivity <= cutoff) {
            inactive.push({ display, lastActivity })
          }
        }

        if (inactive.length === 0 && unknown.length === 0) {
          return await message.reply('Nenhum participante encontrado.')
        }

        inactive.sort((a, b) => a.lastActivity - b.lastActivity)

        let msg = `💤 Inativos (>= ${days} dia(s))\n\n`
        if (inactive.length > 0) {
          msg += inactive
            .slice(0, 50)
            .map(
              i =>
                `- ${i.display} (última atividade: ${new Date(
                  i.lastActivity
                ).toLocaleString('pt-BR')})`
            )
            .join('\n')
          msg += `\n\nTotal inativos: *${inactive.length}*`
        } else {
          msg += 'Nenhum inativo com histórico suficiente.'
        }

        if (unknown.length > 0) {
          msg += `\n\nSem histórico: *${unknown.length}* (não dá pra afirmar inatividade)`
        }

        return await message.reply(msg)
      }
      case 'bloquearcmd':
        await message.reply(
          'Função de bloquear/desbloquear comandos no grupo ainda não implementada.'
        )
        break
      case 'apagar':
        await message.reply(
          'Função de apagar mensagens ainda não implementada.'
        )
        break
      case 'abrirgrupo':
      case 'abrir': {
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const isAdmin = await isSenderAdmin(chat)
        if (!isAdmin)
          return await message.reply(
            'Apenas administradores podem usar este comando.'
          )

        try {
          if (typeof chat.setMessagesAdminsOnly !== 'function') {
            return await message.reply(
              'Seu WhatsApp/biblioteca não suporta alternar “somente admins”.'
            )
          }

          const ok = await chat.setMessagesAdminsOnly(false)
          if (ok)
            return await message.reply('🔓 Grupo aberto: todos podem falar.')
          return await message.reply(
            'Não consegui abrir o grupo. Verifique se o bot é admin.'
          )
        } catch (e) {
          return await message.reply(
            'Erro ao abrir o grupo. Verifique se o bot é admin.'
          )
        }
      }
      case 'fechargrupo':
      case 'fechar': {
        const chat = await message.getChat()
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const isAdmin = await isSenderAdmin(chat)
        if (!isAdmin)
          return await message.reply(
            'Apenas administradores podem usar este comando.'
          )

        try {
          if (typeof chat.setMessagesAdminsOnly !== 'function') {
            return await message.reply(
              'Seu WhatsApp/biblioteca não suporta alternar “somente admins”.'
            )
          }

          const ok = await chat.setMessagesAdminsOnly(true)
          if (ok)
            return await message.reply(
              '🔒 Grupo silenciado: somente admins falam.'
            )
          return await message.reply(
            'Não consegui silenciar o grupo. Verifique se o bot é admin.'
          )
        } catch (e) {
          return await message.reply(
            'Erro ao silenciar o grupo. Verifique se o bot é admin.'
          )
        }
      }
      default:
        await message.reply(
          'Comando de administração de grupo não reconhecido. Use *!admin* <subcomando>'
        )
    }
  }
}
