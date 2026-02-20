/**
 * Jogo Pare
 * Apenas responde com uma mensagem de pausa.
 */
module.exports = {
  name: 'pare',
  description: '⏹ Pare: pausa ou encerra a brincadeira.',
  usage: '*!jogos pare*',

  async execute({ message }) {
    await message.reply('Brincadeira pausada! Use !jogos para recomeçar.')
  }
}
