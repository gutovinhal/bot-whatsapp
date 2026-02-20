/**
 * Jogo Detector de Mentira
 * Responde aleatoriamente Verdade ou Mentira.
 */
module.exports = {
  name: 'detectormentira',
  description:
    '🔍 Detector de Mentira: responde aleatoriamente Verdade ou Mentira.',
  usage: '*!jogos detectormentira*',

  async execute({ message }) {
    await message.reply(Math.random() < 0.5 ? 'Verdade!' : 'Mentira!')
  }
}
