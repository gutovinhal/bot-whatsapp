/**
 * Comando `!regras`.
 *
 * Envia um texto fixo com regras do grupo.
 * Observação: o conteúdo é estático (hardcoded) neste arquivo.
 */
module.exports = {
  name: 'regras',
  description: '📜 Regras do grupo',
  usage: '*!regras*',

  /**
   * Handler do comando.
   * @param {{ message: any }} ctx
   */
  async execute({ message }) {
    const text = `*Regras*:
  SEJAM MUITO BEM-VINDOS!🎉

  Este grupo foi criado para fazer amizades, socializar, marcar rolês e, quem sabe, até virar um “Tinder” pra vocês. 💋

  Como todo grupo, precisamos de algumas regras. Vamos lá? 😈

  ⸻

  1 | Alguns assuntos não são permitidos: Política e Religião.

  2 | Chamar pessoas no privado sem ter liberdade ou sem pedir antes será banido imediatamente.

  3 | Proibido enviar mensagens, fotos ou figurinhas com conteúdo impróprio.

  Inclui nudes, seminudismo, drogas e semelhantes. 😉

  4 | Proibido postar prints de conversas de outros grupos ou de problemas pessoais com membros.

  5 | É extremamente proibido gravar ou expor qualquer membro do grupo ficando com alguém no rolê ou em qualquer outro lugar

  6 | Divulgação de eventos ou vendas

  Para postar qualquer anúncio, evento, venda ou similar, peça autorização a um administrador. Um ADM publicará para você e te mencionará. 🤗

  7 | Participação

  Todos os membros devem ter participação ativa no grupo —
  A verificação de inatividade acontecerá a cada 20 dias e poderá resultar em remoção. ❌

  ⸻

  IMPORTANTE

  Quantidade não é qualidade. Prezamos sempre pela paz. Amamos e respeitamos a todos, independentemente de quem você seja. 💞

  Divirtam-se, façam amizades, conversem, beijem, compareçam aos rolês e vivam bastante! 🎉

  Insta do Grupo:
  https://www.instagram.com/caos.bh?igsh=MTU5OWM4bzJjZjFp`

    await message.reply(text)
  }
}
