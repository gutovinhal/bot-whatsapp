// Subcomando: auto
const { readJSON, writeJSON } = require('../../lib/storage')

module.exports = async function auto({ message, args }) {
  const sub = (args[1] || '').toLowerCase()
  const chat = await message.getChat()
  const chatId = message.from || message.author || ''

  const settings = readJSON('groupSettings.json') || {}
  settings[chatId] = settings[chatId] || {}

  // Em grupo, exige admin; no privado, libera.
  if (chat && chat.isGroup) {
    let isAdmin = false
    try {
      const contact = await message.getContact()
      const senderId =
        (contact && contact.id && contact.id._serialized) ||
        message.author ||
        null
      const admins = (chat.participants || [])
        .filter(p => p && (p.isAdmin || p.isSuperAdmin))
        .map(p => p && p.id && p.id._serialized)
        .filter(Boolean)
      if (senderId && admins.includes(senderId)) isAdmin = true
    } catch (e) {
      isAdmin = false
    }
    if (!isAdmin)
      return await message.reply(
        'Apenas administradores podem ativar/desativar AutoSticker no grupo. Use *!admin autosticker on|off*.'
      )
  }

  const curEnabled =
    settings[chatId].autosticker &&
    settings[chatId].autosticker.enabled === true

  if (sub === 'on') {
    settings[chatId].autosticker = { enabled: true }
    writeJSON('groupSettings.json', settings)
    return await message.reply('✅ AutoSticker ativado.')
  }
  if (sub === 'off') {
    settings[chatId].autosticker = { enabled: false }
    writeJSON('groupSettings.json', settings)
    return await message.reply('✅ AutoSticker desativado.')
  }

  return await message.reply(
    `AutoSticker: *${curEnabled ? 'Ativado' : 'Desativado'}*\nUse *!figurinhas auto on* ou *!figurinhas auto off* (ou *!admin autosticker*)`
  )
}
