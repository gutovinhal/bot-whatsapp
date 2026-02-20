/**
 * Jogo FrasesJR
 * Envia uma frase aleatória engraçada.
 */
module.exports = {
  name: 'frasesjr',
  description: '💬 FrasesJR: envia uma frase aleatória engraçada.',
  usage: '*!jogos frasesjr*',

  async execute({ message }) {
    await message.reply('Frase do WhatsApp Jr.: "A vida é feita de escolhas!"')
  }
}
