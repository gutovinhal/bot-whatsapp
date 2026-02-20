module.exports = {
  name: 'mecante',
  description: '🎤 MeCante',
  usage: '*!jogos mecante*',

  async execute({ message }) {
    await message.reply(
      '🎤 *#MECANTE* 🎤\n\n' +
        '• *Explicação* •\n\n' +
        '1 - Mande uma foto sua no grupo (não pode ser em visualização única), com a legenda: #MeCante.\n' +
        '2 - Os participantes vão te chamar no privado e mandar cantadas criativas, ousadas ou engraçadas.\n' +
        '3 - Quando visualizar a cantada, tire print da conversa e poste no grupo com a sua resposta, sem mostrar quem mandou.\n\n' +
        '*Regras rápidas:*\n• Seja respeitoso(a), pois trata-se de uma brincadeira.\n• Não envie mensagens ofensivas, invasivas ou desrespeitosas.\n\n' +
        'A resposta fica ao seu critério: zoeira, deboche ou até aceitando o flerte 👀\n\n' +
        '*Entendeu como funciona?*\n\n1 - Sim, reaja com 👍\n2 - Não, reaja com 👎\n\n🎉 Capricha na pose e manda ver no *#MeCante*! 😏💬'
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
