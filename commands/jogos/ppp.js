/**
 * Jogo PPP
 * Explica as regras do PPP.
 */
module.exports = {
  name: 'ppp',
  description: '🎯 *PPP: Pego, Penso e Passo*',
  usage: '*!jogos ppp*',

  async execute({ message }) {
    await message.reply(
      `🎯 *PPP — Pego, Penso e Passo* 🫦\n\n❗ *Explicação* ❗\n\n1 - Será enviado uma foto sua no PV de um administrador;\n2 - A foto tem de ter seu nome e o seu @ para ser marcado (pois nem todos utilizam nome no WhatsApp).\n*Ex.: Augusto Vinhal - @AugustoAraujo*\n3 - Será criado uma caixa de votação com as opções: PEGO, PASSO e PENSO.\n4 - Será realizada a votação.\n\n*Entendeu como funciona?*\n\n1 - Sim, reaja com 👍\n2 - Não, reaja com 👎`
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
