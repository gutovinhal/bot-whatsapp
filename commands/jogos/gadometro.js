/**
 * Jogo Gadômetro
 * Mede o valor de gado.
 */
module.exports = {
  name: 'gadometro',
  description: '📊 Gadômetro: mede o nível de gado de um usuário.',
  usage: '*!jogos gadometro*',

  async execute({ message }) {
    await message.reply(`Gadômetro: ${(Math.random() * 100).toFixed(1)}%`)
  }
}
