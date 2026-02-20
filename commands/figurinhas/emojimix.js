// Subcomando: emojimix
module.exports = async function emojimix({ message }) {
  await message.reply(
    'EmojiMix está em standby no momento (não há um provider estável configurado).'
  )
}
