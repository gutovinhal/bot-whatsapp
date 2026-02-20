// Comando: promover
module.exports = async function promover({ message, args, client, helpers }) {
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
      'Marque ou selecione a mensagem do usuário que deseja promover.'
    )
  try {
    await chat.promoteParticipants(targets)
    await message.reply('Usuário(s) promovido(s) a admin!')
  } catch (e) {
    await message.reply(
      'Erro ao promover participante. Certifique-se de ser admin.'
    )
  }
}
