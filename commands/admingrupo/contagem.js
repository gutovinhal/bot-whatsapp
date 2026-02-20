// Comando: contagem
module.exports = async function contagem({ message, args, client, helpers }) {
  // LOG DE DEPURAÇÃO INICIAL
  try {
    console.log('[DEBUG] Comando !admin contagem chamado')
    console.log('[DEBUG] args:', args)
    if (message && message.from)
      console.log('[DEBUG] message.from:', message.from)
    if (client && client.info && client.info.wid)
      console.log('[DEBUG] botId:', client.info.wid.user)
  } catch (e) {
    // Se der erro no log, ignora
  }
  const { readJSON, writeJSON } = helpers
  // subcomando: zerar | expulsar
  const sub = args[1] ? args[1].toLowerCase() : ''
  const chat = await message.getChat()
  if (!chat || !chat.isGroup)
    return await message.reply('Este comando só pode ser usado em grupos.')

  // carregar entrada do grupo
  const stats = readJSON('stats.json') || {}
  const chatId = message.from || message.author || ''
  const entry = stats[chatId]
  if (!entry && sub !== 'zerar')
    return await message.reply('Sem dados de contagem para este grupo ainda.')

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

        if (!num && client && typeof client.getContactById === 'function') {
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

  // Exibir contagem/ranking dos participantes
  let users = (entry && entry.users) || {}
  let lasts = (entry && entry.lasts) || {}
  let joins = (entry && entry.joins) || {}
  let baselines = (entry && entry.baselines) || {}

  // mapear participantes atuais
  const participants = chat.participants || []
  const participantNumbers = (
    await Promise.all(
      participants.map(async p => {
        try {
          let num = String(p.id && p.id.user ? p.id.user : '').trim()
          num = num.replace(/\D/g, '')
          if (!num && client && typeof client.getContactById === 'function') {
            try {
              const c = await client.getContactById(
                p.id._serialized || p.id.user
              )
              num = String((c && c.number) || '').replace(/\D/g, '')
            } catch (e) {
              num = ''
            }
          }
          if (!num) return null
          return num.startsWith('+') ? num : `+${num}`
        } catch (e) {
          return null
        }
      })
    )
  ).filter(Boolean)

  // Remover do stats usuários que não estão mais no grupo
  const currentSet = new Set(participantNumbers)
  const allKeys = new Set([
    ...Object.keys(users),
    ...Object.keys(lasts),
    ...Object.keys(joins),
    ...Object.keys(baselines)
  ])
  let changed = false
  for (const key of allKeys) {
    if (!currentSet.has(key)) {
      if (users[key] !== undefined) {
        delete users[key]
        changed = true
      }
      if (lasts[key] !== undefined) {
        delete lasts[key]
        changed = true
      }
      if (joins[key] !== undefined) {
        delete joins[key]
        changed = true
      }
      if (baselines[key] !== undefined) {
        delete baselines[key]
        changed = true
      }
    }
  }

  // Resetar contagem e data de entrada ao reentrar
  for (const num of participantNumbers) {
    if (!joins[num]) {
      joins[num] = Date.now()
      users[num] = 0
      lasts[num] = null
      baselines[num] = true
      changed = true
    }
  }

  if (changed) {
    // Atualiza o stats.json se houve mudanças
    stats[chatId] = { total: 0, users, lasts, joins, baselines }
    writeJSON('stats.json', stats)
  }

  // Obter o ID serializado do bot para exclusão
  let botId = null
  if (client && client.info && client.info.wid && client.info.wid.user) {
    botId = String(client.info.wid.user).replace(/\D/g, '')
  }

  // Montar ranking apenas dos membros atuais, excluindo o bot
  const combined = {}
  const notifyList = []
  for (const num of participantNumbers) {
    // Exclui o bot da lista
    if (botId && num.replace(/^\+/, '') === botId) continue
    const display = num.replace(/^\+/, '')
    const count = users[num] || 0
    const last = lasts[num] ? new Date(lasts[num]) : null
    const join = joins[num] ? new Date(joins[num]) : null
    combined[display] = { count, last, join, num }
    notifyList.push(num)
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
    const join = item && item.join ? item.join : null
    let lastStr = ''
    let joinStr = ''
    if (join) {
      joinStr = ` | entrou: ${join.toLocaleString('pt-BR')}`
    }
    if (last) {
      lastStr = ` | última msg: ${last.toLocaleString('pt-BR')}`
    }
    msg += `- ${displayNum}: ${cnt}${joinStr}${lastStr}\n`
  }

  msg += `\nTOTAL DE PARTICIPANTES: *${notifyList.length}*`

  // Notificar cada participante (exceto o bot)
  try {
    if (notifyList.length > 0) {
      await message.reply(
        'Você foi mencionado na contagem de mensagens do grupo!',
        {
          mentions: notifyList.map(n =>
            n.startsWith('+') ? n.replace(/^\+/, '') + '@c.us' : n + '@c.us'
          )
        }
      )
    }
  } catch (e) {
    // Se der erro, ignora para não travar o comando
  }

  await message.reply(msg)
}
