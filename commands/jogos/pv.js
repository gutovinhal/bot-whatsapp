/**
 * Jogo PV Liberado
 * Explica as regras do PV Liberado.
 */
module.exports = {
  name: 'pv',
  description: '❤️‍🔥🍻 PV LIBERADO 🍻❤️‍🔥',
  usage: '*!jogos pv*',

  async execute({ message }) {
    await message.reply(
      `❤️‍🔥🍻 *PV LIBERADO* 🍻❤️‍🔥\n\n` +
        `❗ *Explicação* ❗\n\n` +
        `1 - Envie no grupo a figurinha “PV LIBERADO” para mostrar que está aberto(a) a receber mensagens no privado.\n` +
        `2 - Quem se interessar pode te chamar no PV com uma pergunta curiosa, engraçada ou ousada.\n` +
        `3 - Você deve responder no grupo, usando o mesmo número da pergunta para todos saberem de qual conversa se trata.\n\n` +
        `*Exemplo:*\nPergunta (no privado):\n 69 - O que você ainda não realizou e tem vontade?\nResposta (no grupo):\n69 - Ganhar um beijo seu 😌😝\n\n` +
        `*Regras rápidas:*\n• Seja respeitoso(a) nas perguntas.\n• Nada de mensagens ofensivas ou sem noção.\n• É tudo na base da zoeira e do bom senso!\n\n` +
        `*Entendeu como funciona?*\n\n1 - Sim, reaja com 👍\n2 - Não, reaja com 👎\n\n🎉 Entenderam, meus lindos? Então bora jogar!`
    )
    // Fecha o grupo para não-admins
    try {
      const chat = await message.getChat()
      if (
        chat &&
        chat.isGroup &&
        typeof chat.setMessagesAdminsOnly === 'function'
      ) {
        await chat.setMessagesAdminsOnly(true)
      }
    } catch (e) {}
  }
}
