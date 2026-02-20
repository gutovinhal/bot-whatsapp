// Comando: desmute
module.exports = async function desmute({ message, args, client, helpers }) {
  const {
    readJSON,
    writeJSON,
    isSenderAdmin,
    toDigitsId,
    digitsOnly,
    getTargetIds
  } = helpers
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
}
