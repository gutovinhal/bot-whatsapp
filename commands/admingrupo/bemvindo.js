// Comando: bemvindo
module.exports = async function bemvindo({ message, args, client, helpers }) {
  const { readJSON, writeJSON } = helpers
  const sub = args[1] ? args[1].toLowerCase() : ''
  const chat = await message.getChat()
  if (!chat || !chat.isGroup)
    return await message.reply('Este comando só pode ser usado em grupos.')

  // carregar configurações de grupos
  const settings = readJSON('groupSettings.json') || {}
  const chatId = message.from || message.author || ''

  // mensagem padrão solicitada
  const defaultMsg =
    '✨ *BEM-VINDO(A) A SOCIEDADE DO CAOS*!\n\n💃 *APRESENTAÇÃO* 🕺:\n\n📸 *FOTO*:\n\n✅ *NOME*:\n\n🔞 *IDADE*:\n\n☄️ *SIGNO*:\n\n👅*ORIENTAÇÃO SEXUAL*:Hétero, gay, bi, etc.\n\n❤️ *ESTADO CIVIL*: Solteiro, namorando, casado e/ou outros\n\n🏡 *BAIRRO OU CIDADE*:\n\n📷 *INSTAGRAM*:\n\n✨ *TIPO DE ROLÊ PREFERIDO*:\n\n\n\n\n*Não apresentação ou interação sujeita a remoção do grupo*\n\nGentileza ler as regras do grupo. Comando: !regras'

  if (sub === 'on') {
    settings[chatId] = settings[chatId] || {}
    settings[chatId].bemvindo = {
      enabled: true,
      message: defaultMsg
    }
    writeJSON('groupSettings.json', settings)
    await message.reply('✅ Mensagem de boas-vindas ativada para este grupo.')
    return
  }

  if (sub === 'off') {
    settings[chatId] = settings[chatId] || {}
    settings[chatId].bemvindo = { enabled: false, message: defaultMsg }
    writeJSON('groupSettings.json', settings)
    await message.reply(
      '✅ Mensagem de boas-vindas desativada para este grupo.'
    )
    return
  }

  // mostrar estado atual
  const cur = (settings[chatId] && settings[chatId].bemvindo) || null
  const status = cur && cur.enabled ? 'Ativado' : 'Desativado'
  const msgShow = cur && cur.message ? cur.message : defaultMsg
  await message.reply(
    `Bem-vindo: *${status}*\nID do grupo: ${chatId}\nMensagem:\n${msgShow}\n\nUse *!admin bemvindo on* ou *!admin bemvindo off*`
  )
}
