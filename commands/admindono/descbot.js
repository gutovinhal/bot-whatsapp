// Subcomando: descbot
module.exports = async function descbot({ message, client, args }) {
  const newDesc = args.slice(1).join(' ').trim()
  if (!newDesc)
    return await message.reply('Uso: *!dono descbot* <nova descrição/recado>')
  try {
    if (client && typeof client.setStatus === 'function') {
      await client.setStatus(newDesc)
      await message.reply('Descrição/recado atualizada com sucesso!')
    } else if (client && typeof client.setProfileStatus === 'function') {
      await client.setProfileStatus(newDesc)
      await message.reply('Descrição/recado atualizada com sucesso!')
    } else if (client && typeof client.setAbout === 'function') {
      await client.setAbout(newDesc)
      await message.reply('Descrição/recado atualizada com sucesso!')
    } else {
      await message.reply(
        'Alteração de descrição/recado não suportada pela biblioteca atual.'
      )
    }
  } catch (e) {
    await message.reply('Erro ao alterar descrição: ' + (e.message || e))
  }
}
