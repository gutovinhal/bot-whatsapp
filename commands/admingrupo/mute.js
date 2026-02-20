// Comando: mute
module.exports = async function mute({ message, args, client, helpers }) {
  const {
    readJSON,
    writeJSON,
    isSenderAdmin,
    isBotAdminInChat,
    toDigitsId,
    digitsOnly,
    getTargetIds,
    formatDurationMinutes,
    parseMinutes
  } = helpers
  const chat = await message.getChat()
  if (!chat || !chat.isGroup)
    return await message.reply('Este comando só pode ser usado em grupos.')

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
}
