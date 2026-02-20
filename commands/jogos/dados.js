/**
 * Jogo Dados
 * Sorteia um número entre 1 e N (defina N).
 * Mantém estado por chat para o último valor usado.
 */
const sorteStates = new Map()
const SORTE_EXPIRY = 10 * 60 * 1000 // 10 minutos

module.exports = {
  name: 'dados',
  description: '🎲 Dados: sorteia um número entre 1 e N.',
  usage: '*!jogos dados* <max:1-1000>',

  async execute({ message, args }) {
    const chatId = message.from || message.author || 'private'
    const raw = (args[1] || '').toString().trim()
    let max = parseInt(raw, 10)
    let state = sorteStates.get(chatId)

    if (!isNaN(max) && max > 0) {
      if (max > 1000)
        return await message.reply('Valor máximo permitido: 1000.')
      if (max < 1) return await message.reply('Valor mínimo deve ser 1.')
      if (state && state.timeout) clearTimeout(state.timeout)
      const timeout = setTimeout(() => sorteStates.delete(chatId), SORTE_EXPIRY)
      sorteStates.set(chatId, { max, timeout })
    } else {
      if (state && state.max) {
        max = state.max
        if (state.timeout) clearTimeout(state.timeout)
        state.timeout = setTimeout(
          () => sorteStates.delete(chatId),
          SORTE_EXPIRY
        )
        sorteStates.set(chatId, state)
      } else {
        try {
          const chat = await message.getChat()
          const mentioned = message.mentionedIds || []
          if (mentioned.length > 0) {
            max = mentioned.length
          } else if (chat && chat.isGroup && chat.participants) {
            max = chat.participants.length
          } else {
            max = 6
          }
        } catch (e) {
          max = 6
        }
        if (max > 1000)
          return await message.reply('Valor máximo permitido: 1000.')
        if (max < 1) return await message.reply('Valor mínimo deve ser 1.')
        const timeout = setTimeout(
          () => sorteStates.delete(chatId),
          SORTE_EXPIRY
        )
        sorteStates.set(chatId, { max, timeout })
      }
    }
    const result = Math.floor(Math.random() * max) + 1
    await message.reply(
      `🎲 *DADOS* 🎲\n*Rolando entre 1 e ${max}...*\n*Resultado:* ${result}`
    )
  }
}
