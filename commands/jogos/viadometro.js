/**
 * Jogo Viadômetro
 * Mede o valor de viadagem de um usuário ou do autor.
 */
module.exports = {
  name: 'viadometro',
  description: '📊 Viadômetro: mede o nível de viadagem de um usuário.',
  usage: '*!jogos viadometro* [@usuário]',
  async execute({ message }) {
    const valor = (Math.random() * 100).toFixed(1)
    let id = null
    // Se houver menção
    if (message.mentionedIds && message.mentionedIds.length > 0) {
      id = message.mentionedIds[0]
    }
    // Se for resposta a mensagem de alguém
    else if (
      message.hasQuotedMsg &&
      typeof message.getQuotedMessage === 'function'
    ) {
      try {
        const quoted = await message.getQuotedMessage()
        if (quoted && quoted.author) {
          id = quoted.author
        }
      } catch {}
    }
    let resposta
    let mentions = undefined
    if (id) {
      const nome = '@' + String(id).split('@')[0]
      resposta = `${nome}, você é ${valor}% viado.`
      mentions = [id]
    } else {
      resposta = `Você é ${valor}% viado.`
    }
    await message.reply(
      resposta,
      undefined,
      mentions ? { mentions } : undefined
    )
  }
}
