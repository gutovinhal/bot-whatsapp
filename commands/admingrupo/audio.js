// Comando: audio
module.exports = async function audio({ message, args, client, helpers }) {
  const { readJSON, writeJSON, isSenderAdmin } = helpers
  const chat = await message.getChat()
  if (!chat || !chat.isGroup)
    return await message.reply('Este comando só pode ser usado em grupos.')

  const isAdmin = await isSenderAdmin(chat)
  if (!isAdmin)
    return await message.reply(
      'Apenas administradores podem usar este comando.'
    )

  const chatId = message.from || message.author || ''
  const settings = readJSON('groupSettings.json') || {}
  settings[chatId] = settings[chatId] || {}
  settings[chatId].bloquearAudio = settings[chatId].bloquearAudio || {}

  const arg = (args[1] || '').toLowerCase()
  if (arg === 'on' || arg === 'ativar' || arg === '1') {
    settings[chatId].bloquearAudio.enabled = true
    settings[chatId].bloquearAudio.somentePedro = false
    writeJSON('groupSettings.json', settings)
    await message.reply('🔇 Bloqueio de áudios de não-admins ativado!')
  } else if (arg === 'off' || arg === 'desativar' || arg === '0') {
    settings[chatId].bloquearAudio.enabled = false
    settings[chatId].bloquearAudio.somentePedro = false
    writeJSON('groupSettings.json', settings)
    await message.reply('🔊 Bloqueio de áudios de não-admins desativado!')
  } else if (arg === 'pedro') {
    const subarg = (args[2] || '').toLowerCase()
    if (subarg === 'on' || subarg === 'ativar' || subarg === '1') {
      settings[chatId].bloquearAudio.enabled = false
      settings[chatId].bloquearAudio.somentePedro = true
      writeJSON('groupSettings.json', settings)
      await message.reply('🔇 Bloqueio de áudios ativado apenas para o Pedro!')
    } else if (subarg === 'off' || subarg === 'desativar' || subarg === '0') {
      settings[chatId].bloquearAudio.somentePedro = false
      writeJSON('groupSettings.json', settings)
      await message.reply('🔊 Bloqueio de áudios do Pedro desativado!')
    } else {
      await message.reply('Uso: *!admin audio pedro* on|off')
    }
  } else {
    await message.reply(
      'Uso: *!admin audio* on|off ou *!admin audio pedro* on|off'
    )
  }
}
