/**
 * Jogo Sortear
 * Sorteia um usuário do grupo e responde com uma frase.
 */
module.exports = {
  name: 'sortear',
  description:
    '🎯 Sortear: sorteia um usuário do grupo e responde com uma frase.',
  usage: '*!jogos sortear*',

  async execute({ message, client }) {
    try {
      const chat = await message.getChat()
      if (!chat.isGroup) {
        await message.reply('Este jogo só funciona em grupos.')
        return
      }
      const participants = chat.participants.filter(
        p => p.id && !p.id._serialized.includes('bot')
      )
      if (participants.length === 0) {
        await message.reply('Não há participantes válidos para sortear.')
        return
      }
      const sorteado =
        participants[Math.floor(Math.random() * participants.length)]
      const nome = sorteado.id._serialized.split('@')[0]
      await message.reply(
        `Usuário sorteado: @${nome}\nParabéns, você foi escolhido!`,
        undefined,
        { mentions: [sorteado.id._serialized] }
      )
    } catch (e) {
      await message.reply('Erro ao sortear usuário.')
    }
  }
}
