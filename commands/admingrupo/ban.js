// Comando: ban
module.exports = async function ban({ message, args, client, helpers }) {
  const { readBlacklist, writeBlacklist, computeUserKeyFromId } = helpers
  const mentioned = message.mentionedIds || []
  const chat = await message.getChat()
  if (!chat || !chat.isGroup)
    return await message.reply('Este comando só pode ser usado em grupos.')
  let targets = mentioned
  if (targets.length === 0 && message.hasQuotedMsg) {
    const quoted = await message.getQuotedMessage()
    if (quoted && quoted.author) targets = [quoted.author]
  }
  if (targets.length === 0)
    return await message.reply(
      'Marque ou selecione a mensagem do usuário que deseja banir.'
    )

  // Proteção para o número do dono
  const ownerNumbers = [
    '553198463410', // sem +
    '+553198463410',
    '55 31 9846-3410',
    '553198463410@c.us',
    '98463410',
    '31 9846-3410',
    '3198463410',
    '5531984634100', // possíveis variações
    '553198463410@c.us',
    '553198463410@s.whatsapp.net',
    '5531984634100@c.us',
    '5531984634100@s.whatsapp.net',
    'meu_dono' // caso use @usuario
  ]
  // Função para normalizar ids
  function normalizeId(id) {
    return String(id)
      .replace(/[^0-9]/g, '')
      .replace(/^0+/, '')
      .replace(/^55/, '55')
  }
  // Verifica se algum alvo é o dono
  const isOwner = targets.some(t => {
    const norm = normalizeId(t)
    return ownerNumbers.some(o => normalizeId(o) === norm)
  })
  if (isOwner) {
    return await message.reply('quem tentar me banir, vai ter que mamar')
  }
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
        ? `\n\n🚫 Adicionado automaticamente à *!admin lista* após 3 bans:\n- ${autoAdded.join('\n- ')}`
        : ''
    await message.reply(`Usuário(s) banido(s) do grupo!${extra}`)
  } catch (e) {
    await message.reply(
      'Erro ao banir participante. Certifique-se de ser admin.'
    )
  }
}
