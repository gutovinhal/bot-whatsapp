/**
 * Jogo Bafômetro
 * Mede o nível de álcool no sangue de forma divertida.
 */
module.exports = {
  name: 'bafometro',
  description: '📊 Bafômetro: mede o nível de álcool no sangue.',
  usage: '*!jogos bafometro*',

  async execute({ message }) {
    await message.reply(`Bafômetro: ${(Math.random() * 2).toFixed(2)} mg/L`)
  }
}
