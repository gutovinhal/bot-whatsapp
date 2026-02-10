// Estado de dados por chat (mantém o último `max` usado por 10 minutos).
// Isso permite o usuário chamar `!jogos dados` repetidamente sem reenviar o max.
const sorteStates = new Map()
const SORTE_EXPIRY = 10 * 60 * 1000 // 10 minutos

/**
 * Comando `!jogos`.
 *
 * Pequenas interações aleatórias (medidores, sorteios e brincadeiras).
 * Observação: mantém estado em memória para `dados` (cache por chat).
 */
module.exports = {
  name: 'jogos',
  description: '🎮🕹️ Comandos de jogos e interações divertidas.',
  usage: '*!jogos* <subcomando> [@usuário|args]',

  /**
   * Handler do comando.
   * @param {{ message: any, args: string[], client: any }} ctx
   */
  async execute({ message, args, client }) {
    const DEBUG_JOGOS =
      String(process.env.DEBUG_JOGOS || '').toLowerCase() === '1' ||
      String(process.env.DEBUG_JOGOS || '').toLowerCase() === 'true'

    const debugLog = (...parts) => {
      if (!DEBUG_JOGOS) return
      try {
        console.log('[jogos:debug]', ...parts)
      } catch (e) {
        // ignore
      }
    }

    const digitsOnly = value => (value || '').toString().replace(/\D/g, '')

    // Cache por execução para não repetir chamadas de rede.
    const contactDigitsCache = new Map()

    // Resolve dígitos reais a partir de um id (útil quando vier como @lid).
    const resolveDigitsFromId = async id => {
      const key = String(id || '')
      if (!key) return null
      if (contactDigitsCache.has(key)) return contactDigitsCache.get(key)

      let digits = digitsOnly(key)
      if (!digits) {
        // fallback: às vezes vem como "12345@c.us" e split ajuda
        digits = digitsOnly(key.split('@')[0])
      }

      const isLikelyLid = /@lid\b/i.test(key)

      // Se for @lid, o "digitsOnly" costuma virar um id interno e não o telefone real.
      // Então, mesmo que existam dígitos no id, tentamos resolver via contato.
      if (!digits || isLikelyLid) {
        try {
          if (client && typeof client.getContactById === 'function') {
            const c = await client.getContactById(key)
            const resolved =
              digitsOnly((c && c.number) || '') ||
              digitsOnly((c && c.id && c.id.user) || '') ||
              null

            // Preferir o número real quando existir; senão, manter o fallback.
            digits = resolved || digits || null
          }
        } catch (e) {
          debugLog('resolveDigitsFromId error', {
            id: key,
            message: e && e.message ? e.message : String(e)
          })
          digits = digits || null
        }
      }

      contactDigitsCache.set(key, digits)
      return digits
    }

    const pickTargetId = async () => {
      const mentioned = message.mentionedIds || []
      if (mentioned.length > 0) return mentioned[0]

      // Se o comando for usado respondendo (reply), usa o autor da mensagem citada.
      if (message.hasQuotedMsg) {
        try {
          const q = await message.getQuotedMessage()
          if (q && q.author) return q.author
          if (q && q.from) return q.from
        } catch (e) {
          // ignore
        }
      }

      // Suporte: número digitado após o subcomando (ex.: "!jogos testosterometro 5531...").
      const raw = args.slice(1).join(' ')
      const rawDigits = digitsOnly(raw)
      if (rawDigits.length >= 10) return rawDigits

      return message.author || message.from || ''
    }

    // Coloque aqui os números (apenas dígitos) que devem receber o “boost”.
    // Para adicionar mais, é só incluir na lista abaixo.
    // Obs.: guardamos variações com e sem DDI 55, pois `getContactById()`
    // pode retornar o número sem o código do país.
    const SPECIAL_TARGET_INPUT = ['553191091313', '5531991091313']
    const SPECIAL_TARGET_DIGITS = new Set()

    const addSpecialDigitsVariants = raw => {
      const d = digitsOnly(raw)
      if (!d) return

      // forma original
      SPECIAL_TARGET_DIGITS.add(d)

      // sem DDI (55)
      if (d.startsWith('55') && d.length >= 12) {
        SPECIAL_TARGET_DIGITS.add(d.slice(2))
      }

      // com DDI (55)
      if (!d.startsWith('55') && (d.length === 10 || d.length === 11)) {
        SPECIAL_TARGET_DIGITS.add(`55${d}`)
      }
    }

    for (const n of SPECIAL_TARGET_INPUT) addSpecialDigitsVariants(n)

    const isSpecialTarget = async id => {
      const digits = await resolveDigitsFromId(id)
      if (!digits) return false
      const d = digitsOnly(digits)
      if (!d) return false

      if (SPECIAL_TARGET_DIGITS.has(d)) return true
      // Tentativas adicionais (caso venha em formato diferente do cache)
      if (d.startsWith('55') && SPECIAL_TARGET_DIGITS.has(d.slice(2)))
        return true
      if (!d.startsWith('55') && SPECIAL_TARGET_DIGITS.has(`55${d}`))
        return true
      return false
    }

    // Seleciona subcomando.
    const cmd = (args[0] || '').toLowerCase()
    if (!cmd) {
      const entries = [
        {
          title: '🪙 *CaraECoroa*',
          desc: 'Joga moeda.',
          usage: '*!jogos caraecoroa*'
        },
        {
          title: '📊 *Viadometro / Gadometro / Bafometro*',
          desc: 'Medidores de humor/brincadeira.',
          usage: '*!jogos viadometro* @usuário'
        },
        {
          title: '💪 *Testosterômetro*',
          desc: 'Mede a testosterona.',
          usage: '*!jogos testosterometro*'
        },
        {
          title: '🔍 *DetectorMentira*',
          desc: 'Responde aleatoriamente Verdade/Mentira.',
          usage: '*!jogos detectormentira*'
        },
        {
          title: '💑 *Compatibilidade / Casal*',
          desc: 'Mede compatibilidade entre dois usuários.',
          usage: '*!jogos compatibilidade* @a @b'
        },
        {
          title: '💬 *FrasesJR*',
          desc: 'Envia uma frase aleatória engraçada.',
          usage: '*!jogos frasesjr*'
        },
        {
          title: '🎲 *Chance*',
          desc: 'Calcula porcentagem de chance.',
          usage: '*!jogos chance* @usuário'
        },
        {
          title: '🏆 *Top5*',
          desc: 'Gera um top 5 aleatório no tema.',
          usage: '*!jogos top5* <tema>'
        },
        {
          title: '🎲 *Dados*',
          desc: 'Sorteia um número entre 1 e N (defina N).',
          usage: '*!jogos dados* <max:1-1000>'
        },
        {
          title: '🎯 *Sortear*',
          desc: 'Sorteia um usuário do grupo e responde com uma frase.',
          usage: '*!jogos sortear* [mensagem]'
        },
        {
          title: '🎯 *PPP — Pego, Penso e Passo* 🫦',
          desc: 'Pego, Penso e Passo.',
          usage: '*!jogos ppp*'
        }
      ]

      let msg =
        'Comandos de Jogos (use: *!jogos* <subcomando> [@usuário|args])\n\n'
      for (const e of entries) {
        const titleStr = `- ${e.title}:`
        msg += `${titleStr} ${e.desc}\n`
        const indent = ' '.repeat(titleStr.length + 1)
        msg += `${indent}Uso: ${e.usage}\n\n`
      }
      msg +=
        'Lembre-se: jogos são apenas para diversão; não incentive apostas reais.'

      await message.reply(msg)
      return
    }
    switch (cmd) {
      case 'caraecoroa':
        await message.reply(Math.random() < 0.5 ? 'Deu cara!' : 'Deu coroa!')
        break

      case 'viadometro': {
        const targetId = await pickTargetId()
        const special = await isSpecialTarget(targetId)
        if (DEBUG_JOGOS) {
          let quotedAuthor = null
          let quotedFrom = null
          if (message.hasQuotedMsg) {
            try {
              const q = await message.getQuotedMessage()
              quotedAuthor = q && q.author ? q.author : null
              quotedFrom = q && q.from ? q.from : null
            } catch (e) {
              // ignore
            }
          }

          debugLog('meter', {
            cmd,
            args,
            sender: message.author || message.from || null,
            mentionedIds: message.mentionedIds || [],
            hasQuotedMsg: Boolean(message.hasQuotedMsg),
            quotedAuthor,
            quotedFrom,
            targetId,
            targetDigits: await resolveDigitsFromId(targetId),
            special
          })
        }

        const value = special
          ? (90 + Math.random() * 10).toFixed(1)
          : (Math.random() * 100).toFixed(1)
        await message.reply(`Viadometro: ${value}%`)
        break
      }

      case 'testosterometro':
      case 'testosterômetro': {
        const targetId = await pickTargetId()
        const special = await isSpecialTarget(targetId)
        if (DEBUG_JOGOS) {
          let quotedAuthor = null
          let quotedFrom = null
          if (message.hasQuotedMsg) {
            try {
              const q = await message.getQuotedMessage()
              quotedAuthor = q && q.author ? q.author : null
              quotedFrom = q && q.from ? q.from : null
            } catch (e) {
              // ignore
            }
          }

          debugLog('meter', {
            cmd,
            args,
            sender: message.author || message.from || null,
            mentionedIds: message.mentionedIds || [],
            hasQuotedMsg: Boolean(message.hasQuotedMsg),
            quotedAuthor,
            quotedFrom,
            targetId,
            targetDigits: await resolveDigitsFromId(targetId),
            special
          })
        }

        const value = special
          ? (1 + Math.random() * 11).toFixed(1)
          : (Math.random() * 100).toFixed(1)
        await message.reply(`Testosterômetro: ${value}%`)
        break
      }

      case 'gadometro':
        await message.reply(`Gadômetro: ${(Math.random() * 100).toFixed(1)}%`)
        break

      case 'bafometro':
        await message.reply(`Bafômetro: ${(Math.random() * 2).toFixed(2)} mg/L`)
        break

      case 'detectormentira':
        await message.reply(Math.random() < 0.5 ? 'Verdade!' : 'Mentira!')
        break

      case 'compatibilidade':
        await message.reply(
          `Compatibilidade: ${(Math.random() * 100).toFixed(1)}%`
        )
        break

      case 'casal':
        await message.reply('Vocês formam um casal incrível! 💑')
        break

      case 'frasesjr':
        await message.reply(
          'Frase do WhatsApp Jr.: "A vida é feita de escolhas!"'
        )
        break

      case 'chance':
        await message.reply(`Chance: ${(Math.random() * 100).toFixed(1)}%`)
        break

      case 'top5':
        await message.reply(
          'Top 5: 1. Fulano 2. Ciclano 3. Beltrano 4. Sicrano 5. Outro'
        )
        break

      case 'dados': {
        // Suporta estado por chat: primeiro uso com número define o `max` para 10 minutos.
        const chatId = message.from || message.author || 'private'
        const raw = (args[1] || '').toString().trim()
        let max = parseInt(raw, 10)
        let state = sorteStates.get(chatId)

        if (!isNaN(max) && max > 0) {
          // valor explícito fornecido — valida e salva no estado
          if (max > 1000)
            return await message.reply('Valor máximo permitido: 1000.')
          if (max < 1) return await message.reply('Valor mínimo deve ser 1.')

          if (state && state.timeout) clearTimeout(state.timeout)
          const timeout = setTimeout(
            () => sorteStates.delete(chatId),
            SORTE_EXPIRY
          )
          sorteStates.set(chatId, { max, timeout })
        } else {
          // sem valor explícito — tentar usar estado existente
          if (state && state.max) {
            max = state.max
            // refresh timeout
            if (state.timeout) clearTimeout(state.timeout)
            state.timeout = setTimeout(
              () => sorteStates.delete(chatId),
              SORTE_EXPIRY
            )
            sorteStates.set(chatId, state)
          } else {
            // inferir do grupo/menções e salvar estado
            try {
              const chat = await message.getChat()
              const mentioned = message.mentionedIds || []
              if (mentioned.length > 0) {
                max = mentioned.length
              } else if (chat && chat.isGroup && chat.participants) {
                max = chat.participants.length
              } else {
                max = 6
              }
            } catch (e) {
              max = 6
            }

            if (max > 1000)
              return await message.reply('Valor máximo permitido: 1000.')
            if (max < 1) return await message.reply('Valor mínimo deve ser 1.')

            const timeout = setTimeout(
              () => sorteStates.delete(chatId),
              SORTE_EXPIRY
            )
            sorteStates.set(chatId, { max, timeout })
          }
        }

        const result = Math.floor(Math.random() * max) + 1
        await message.reply(
          `🎲 Rolando entre 1 e ${max}...\nResultado: *${result}*`
        )
        break
      }

      case 'sortear': {
        const chat = await message.getChat().catch(() => null)
        if (!chat || !chat.isGroup)
          return await message.reply(
            'Este comando só pode ser usado em grupos.'
          )

        const participants = Array.isArray(chat.participants)
          ? chat.participants
          : []
        if (participants.length === 0)
          return await message.reply('Nenhum participante encontrado.')

        const participantIds = participants
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

        let botId = null
        try {
          botId =
            (client &&
              client.info &&
              client.info.wid &&
              (client.info.wid._serialized || client.info.wid.user)) ||
            null
          if (botId && !String(botId).includes('@')) botId = `${botId}@c.us`
        } catch (e) {
          botId = null
        }

        const pool = botId
          ? participantIds.filter(id => String(id) !== String(botId))
          : participantIds

        if (pool.length === 0)
          return await message.reply(
            'Não consegui montar a lista de participantes para sortear.'
          )

        const pickerId = String(
          pool[Math.floor(Math.random() * pool.length)] || ''
        ).trim()
        if (!pickerId)
          return await message.reply(
            'Não consegui identificar o participante sorteado.'
          )

        const senderId = String(message.author || message.from || '').trim()
        const senderAt = senderId ? `@${senderId.split('@')[0]}` : ''
        const pickedAt = `@${pickerId.split('@')[0]}`

        const rawUserText = args.slice(1).join(' ').trim()
        const textWithoutMentions = String(rawUserText || '')
          .replace(/@\S+/g, '')
          .replace(/\s+/g, ' ')
          .trim()

        const hasComigo = /\bcomigo\b/i.test(textWithoutMentions)

        const ensurePunctuation = s => {
          const t = String(s || '').trim()
          if (!t) return ''
          return /[.!?…]$/.test(t) ? t : `${t}.`
        }

        const normalizeAction = s => {
          let t = String(s || '').trim()
          if (!t) return ''

          if (hasComigo && senderAt) {
            t = t.replace(/\bcomigo\b/gi, `com ${senderAt}`)
          }

          t = t
            .replace(/\balgu[eé]m\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim()

          // Normalizar “pra” no início (português mais correto)
          t = t.replace(/^pra\b/i, 'para')

          // Evitar final ruim: “... o.” / “... para.”
          t = t
            .replace(/\s+(o|a|os|as|um|uma|uns|umas)\s*$/i, '')
            .replace(/\s+(pra|para|pro)\s*$/i, '')
            .replace(/\s+/g, ' ')
            .trim()

          if (!t) return ''

          if (
            !/^(para|pra|pro|com|sem|de|do|da|dos|das|em|no|na|nos|nas|a|ao|à)\b/i.test(
              t
            )
          ) {
            t = `para ${t}`
          }

          return ensurePunctuation(t)
        }

        const action = normalizeAction(textWithoutMentions)
        let outText = ''

        if (action) {
          outText = `🎲 ${pickedAt} foi sorteado(a) ${action}`
        } else {
          // Retorno padrão pedido
          outText = `🎲 Você foi sorteado(a) ${pickedAt}`
        }

        const mentions = [pickerId]
        if (hasComigo && senderId) mentions.push(senderId)
        const uniqueMentions = [...new Set(mentions.filter(Boolean))]
        await chat.sendMessage(outText, { mentions: uniqueMentions })
        break
      }

      case 'ppp':
        await message.reply(
          `🎯 *PPP — Pego, Penso e Passo* 🫦
          
          ❗ *Explicação* ❗
          
          1 - Será enviado uma foto sua no PV de um administrador;
          2 - A foto tem de ter seu nome e o seu @ para ser marcado (pois nem todos utilizam nome no WhatsApp).
              *Ex.: Augusto Vinhal - @AugustoAraujo*
          3 - Será criado uma caixa de votação com as opções: PEGO, PASSO e PENSO.
          4 - Será realizada a votação.

          *Entendeu como funciona?*

          1 - Sim, reaja com 👍
          2 - Não, reaja com 👎`
        )
        break

      case 'paredao':
        {
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
          } catch (e) {
            // ignore
          }

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
          } catch (e) {
            // ignore
          }

          const emparedadoExample = exampleTargetId
            ? `@${String(exampleTargetId).split('@')[0]} (exemplo)`
            : '@exemplo (exemplo)'
          const exampleMentions = exampleTargetId ? [exampleTargetId] : []

          await message.reply(
            `🔥*PAREDÃO*🔥

          📌 *Como funciona*:

          1 - Um participante será escolhido como EMPAREDADO.
          2 - A partir do anúncio, o emparedado ficará ${Math.round(delayMinutes)} minutos no paredão.
          3 - Durante esse tempo, todos do grupo podem fazer perguntas diretamente para ele(a).
          4 - As perguntas devem ser difíceis, constrangedoras ou que coloquem em saia justa.
          5 - O emparedado é obrigado a responder tudo, com sinceridade.
          6 - Ao final da brincadeira, o emparedado escolhe outra pessoa para ser emparedado novamente.

          ⚠️ *Durante as respostas do emparedado, o resto do grupo deverá permanecer em silêncio para que possamos acompanhar as respostas*.

          EMPAREDADO: ${emparedadoExample}
          ⏳ O emparedado será definido em ${Math.round(delayMinutes)} min.
          
          *Entendeu como funciona?*

          1 - Sim, reaja com 👍
          2 - Não, reaja com 👎`,
            undefined,
            exampleMentions.length > 0
              ? { mentions: exampleMentions }
              : undefined
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
                        (client.info.wid._serialized ||
                          client.info.wid.user)) ||
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
              } catch (err) {
                // ignore
              }
            }
          }, delayMs)
        }
        break

      default:
        await message.reply(
          'Comando de jogo não reconhecido. Use *!jogos* <comando>. Exemplos: caraecoroa, viadometro, testosterometro, chance, etc.'
        )
    }
  }
}
