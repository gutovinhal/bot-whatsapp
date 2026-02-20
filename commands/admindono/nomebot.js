// Subcomando: nomebot
module.exports = async function nomebot({ message, client, args }) {
  const newName = args.slice(1).join(' ').trim()
  if (!newName) return await message.reply('Uso: *!dono nomebot* <novo nome>')
  try {
    if (client && typeof client.setDisplayName === 'function') {
      const ok = await client.setDisplayName(newName)
      if (ok) {
        await message.reply('Nome do bot atualizado para: ' + newName)
      } else {
        await message.reply(
          'Não consegui alterar o nome agora (o WhatsApp pode bloquear/limitar a troca de nome no momento). Tente novamente mais tarde.'
        )
      }
    } else if (client && typeof client.setProfileName === 'function') {
      await client.setProfileName(newName)
      await message.reply('Nome do bot atualizado para: ' + newName)
    } else if (client && typeof client.setName === 'function') {
      await client.setName(newName)
      await message.reply('Nome do bot atualizado para: ' + newName)
    } else {
      await message.reply(
        'Alteração de nome não suportada pela versão da biblioteca em uso.'
      )
    }
  } catch (e) {
    await message.reply('Erro ao alterar nome: ' + (e.message || e))
  }
}
