/**
 * Jogo Chance
 * Calcula porcentagem de chance.
 */
module.exports = {
  name: 'chance',
  description: '🎲 Chance: calcula porcentagem de chance.',
  usage: '*!jogos chance* @usuário',

  async execute({ message }) {
    await message.reply(`Chance: ${(Math.random() * 100).toFixed(1)}%`)
  }
}
