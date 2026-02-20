module.exports = {
  name: 'secrets',
  description: '🫢 Secrets 🤫',
  usage: '*!jogos secrets*',

  async execute({ message }) {
    await message.reply(
      `🫢 Secrets 🤫\n\n 📩 Envie e receba mensagens anônimas\n Perfeito para confissões, elogios ou aquela alfinetada misteriosa 👀\n\n ✅ Como funciona:\n\n 1. Use o link do Secrets (abaixo) para enviar ou receber mensagens 100% anônimas.\n\n ⚠️ Regras importantes: 1 - Respeito sempre!\n 2 - Mensagens com ódio, xingamentos ou ataques não serão toleradas.\n 3 - É uma brincadeira, então leve na esportiva e aproveite a zoeira com responsabilidade.\n\n *Entendeu como funciona?*\n\n1 - Sim, reaja com 👍\n2 - Não, reaja com 👎\n\n 🔗 Link para enviar mensagens: https://ngl.link/admmarih`
    )
  }
}
