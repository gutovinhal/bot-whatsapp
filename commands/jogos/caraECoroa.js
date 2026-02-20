/**
 * Jogo Cara ou Coroa
 * Sorteia entre cara ou coroa.
 */
module.exports = {
  name: 'caraecoroa',
  description: '🦙 Cara ou Coroa: sorteia cara ou coroa.',
  usage: '*!jogos caraecoroa*',

  async execute({ message }) {
    await message.reply(Math.random() < 0.5 ? 'Deu cara!' : 'Deu coroa!')
  }
}
