/**
 * Jogo Compatibilidade
 * Mede a compatibilidade entre dois usuários.
 */
module.exports = {
  name: 'compatibilidade',
  description:
    '💑 Compatibilidade: mede a compatibilidade entre dois usuários.',
  usage: '*!jogos compatibilidade* @a @b',

  async execute({ message }) {
    await message.reply(`Compatibilidade: ${(Math.random() * 100).toFixed(1)}%`)
  }
}
