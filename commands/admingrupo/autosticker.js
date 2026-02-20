// Comando: autosticker
module.exports = async function autosticker({
  message,
  args,
  client,
  helpers
}) {
  const { readJSON, writeJSON, isSenderAdmin } = helpers
  const sub = args[1] ? args[1].toLowerCase() : ''
  const chat = await message.getChat()
  if (!chat || !chat.isGroup)
    return await message.reply('Este comando só pode ser usado em grupos.')

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
  let nextEnabled = !curEnabled
  if (sub === 'on') nextEnabled = true
  if (sub === 'off') nextEnabled = false

  settings[chatId].autosticker = { enabled: nextEnabled }
  writeJSON('groupSettings.json', settings)

  return await message.reply(
    nextEnabled
      ? '🟢 Autosticker ativado neste grupo.'
      : '🔴 Autosticker desativado neste grupo.'
  )
}
