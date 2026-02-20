// Comando: lista
module.exports = async function lista({ message, args, client, helpers }) {
  const {
    readBlacklist,
    writeBlacklist,
    getTargetIds,
    digitsOnly,
    computeUserKeyFromId,
    isSenderAdmin
  } = helpers
  const sub = (args[1] || '').toLowerCase()

  const chat = await message.getChat()
  if (!chat || !chat.isGroup)
    return await message.reply('Este comando só pode ser usado em grupos.')

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
    `📛 Lista (global) — ${items.length} item(ns)\n\n${lines.join('\n')}\n\nDica: ao banir o mesmo número 3x, ele entra automaticamente na lista.`
  )
}
