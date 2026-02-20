// Comando: link
module.exports = async function link({ message, client }) {
  const chat = await message.getChat()
  if (!chat || !chat.isGroup)
    return await message.reply('Este comando só pode ser usado em grupos.')
  try {
    let link = null
    // tenta métodos disponíveis em diferentes versões da lib
    if (chat && typeof chat.getInviteCode === 'function') {
      try {
        const code = await chat.getInviteCode()
        if (code) link = `https://chat.whatsapp.com/${code}`
      } catch (e) {
        // ignore e tente outras formas
      }
    }
    if (!link && chat && typeof chat.getInviteLink === 'function') {
      try {
        link = await chat.getInviteLink()
      } catch (e) {
        // ignore
      }
    }
    if (!link && chat && chat.inviteCode) {
      link = `https://chat.whatsapp.com/${chat.inviteCode}`
    }
    if (!link) {
      return await message.reply(
        'Não foi possível obter o link do grupo. Verifique se o bot é admin ou tente *!admin resetlink*.'
      )
    }
    await message.reply(`Link do grupo: ${link}`)
  } catch (e) {
    await message.reply('Erro ao obter link do grupo: ' + (e && e.message))
  }
}
