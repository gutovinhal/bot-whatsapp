// Comando: todos
module.exports = async function todos({ message, args, client, helpers }) {
  const chat = await message.getChat()
  if (!chat || !chat.isGroup)
    return await message.reply('Este comando só pode ser usado em grupos.')

  let texto = args.slice(1).join(' ').trim()
  if (!texto) {
    texto = 'Apareçam leais súditos!'
  }

  // Coleta todos os participantes
  const participants = chat.participants || []
  if (participants.length === 0)
    return await message.reply('Nenhum participante encontrado.')
  const mentionIds = [
    ...new Set(
      participants
        .map(p => {
          if (!p) return null
          if (p.id && p.id._serialized) return p.id._serialized
          if (p.id && typeof p.id === 'string') return p.id
          if (p._serialized) return p._serialized
          if (p.id && p.id.user) return `${String(p.id.user)}@c.us`
          return null
        })
        .filter(Boolean)
    )
  ]

  // Envia mensagem com menção oculta
  await chat.sendMessage(`Todos do grupo: ${texto}`, {
    mentions: mentionIds
  })
}
