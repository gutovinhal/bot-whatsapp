// Comando: rebaixar
module.exports = async function rebaixar({ message, args, client, helpers }) {
  const { isSenderAdmin, toDigitsId, getTargetIds } = helpers
  const chat = await message.getChat()
  if (!chat || !chat.isGroup)
    return await message.reply('Este comando só pode ser usado em grupos.')

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
      const did = toDigitsId(pid) || (p && p.id && p.id._serialized) || null
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
    return await message.reply('Não encontrei ninguém elegível para rebaixar.')
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
      const cantMsg = cant.length > 0 ? `\n\nObs:\n- ${cant.join('\n- ')}` : ''
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
}
