/**
 * Jogo Casal
 * Responde de forma divertida sobre casais.
 */
module.exports = {
  name: 'casal',
  description: '💑 Casal: responde uma mensagem de casal.',
  usage: '*!jogos casal*',

  async execute({ message }) {
    await message.reply('Vocês formam um casal incrível! 💑')
  }
}
