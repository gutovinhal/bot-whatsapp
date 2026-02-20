/**
 * Jogo Top5
 * Gera um top 5 aleatório no tema.

module.exports = {
  name: 'top5',
  description: '🏆 Top5: gera um top 5 aleatório no tema.',
  usage: '*!jogos top5* <tema>',

  async execute({ message, args }) {
    const tema = args[1] || 'tema'
    await message.reply(
      `Top 5: 1. Fulano 2. Ciclano 3. Beltrano 4. Sicrano 5. Outro (${tema})`
    )
  }
}
 */