module.exports = {
  name: '*VERDADE OU CONSEQUÊNCIA*',
  description: '🔞 Jogo de Verdade ou Consequência.',
  usage: '*!jogos vec*',

  async execute({ message, client }) {
    const delayMinutes = 2
    const delayMs = delayMinutes * 60 * 1000
    let exampleTargetId = null
    try {
      const chat = await message.getChat()
      if (chat && chat.isGroup && Array.isArray(chat.participants)) {
        let botId = null
        try {
          botId =
            (client &&
              client.info &&
              client.info.wid &&
              (client.info.wid._serialized || client.info.wid.user)) ||
            null
          if (botId && !String(botId).includes('@')) {
            botId = `${botId}@c.us`
          }
        } catch (e) {
          botId = null
        }
        const ids = chat.participants
          .map(p => {
            if (!p) return null
            if (p.id && p.id._serialized) return p.id._serialized
            if (p.id && p.id.user) return `${String(p.id.user)}@c.us`
            if (p._serialized) return p._serialized
            return null
          })
          .filter(Boolean)
          .filter(id => !botId || id !== botId)
        if (ids.length > 0) {
          exampleTargetId = ids[Math.floor(Math.random() * ids.length)]
        }
      }
    } catch (e) {}
    const vecExample = exampleTargetId
      ? `@${String(exampleTargetId).split('@')[0]}`
      : '@exemplo'
    const exampleMentions = exampleTargetId ? [exampleTargetId] : []
    await message.reply(
      `🔞 *VERDADE OU CONSEQUÊNCIA* 🔞\n\n\n✅ *Como funciona:*\n\n 1 - Será enviada *DUAS FIGURINHAS*? uma *VERDADE* e outra *CONSEQUÊNCIA* salve-as para participar.\n 2 - Para iniciarmos o jogo será selecionado uma pessoa e ela deverá enviar no grupo uma das figurinhas: *VERDADE* ou *CONSEQUÊNCIA*.\n *Exemplo*: ${vecExample}\n 3 - Alguém do grupo irá mandar no seu privado uma *pergunta*, caso seja verdade ou dando um *desafio*, caso seja consequência.\n 4 - *IMPORTANTE:* Quem fizer a pergunta ou desafio deve numerar para facilitar a identificação no grupo.\n       Exemplo: 01, 02, 03... \n 5 - Você deve voltar ao grupo e responder com o mesmo número da pergunta ou desafio recebido, seja com texto ou com uma foto, em visualização única, se necessário.\n\n⚠️ *Exemplo - VERDADE:*\n\n - João envia a figurinha *VERDADE* no grupo.\n - Maria chama João no privado e pergunta:\n - 10 - É verdade que você quer um ménage comigo e com a fulana?\n - João responde no grupo:\n - 10 - Sim.\n\n\n⚠️ *Exemplo - CONSEQUÊNCIA:*\n\n - João envia a figurinha *CONSEQUÊNCIA* no grupo.\n - Maria manda no privado:\n - 10 - Envie um semi nude no grupo.\n - João cumpre o desafio e responde no grupo com a foto em visualização única:\n - 10 - 📷\n\n\n*Entendeu como funciona?*\n\n 1 - Sim, reaja com 👍\n 2 - Não, reaja com 👎\n\n Então bora brincar, sem vergonha! 😏🎉\n\n⏳ O participante será definido em ${delayMinutes} min.`,
      undefined,
      exampleMentions.length > 0 ? { mentions: exampleMentions } : undefined
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
    // Seleção automática após 2 minutos
    setTimeout(async () => {
      try {
        let finalTargetId = exampleTargetId
        if (!finalTargetId) {
          const chat = await message.getChat()
          if (chat && chat.isGroup && Array.isArray(chat.participants)) {
            let botId = null
            try {
              botId =
                (client &&
                  client.info &&
                  client.info.wid &&
                  (client.info.wid._serialized || client.info.wid.user)) ||
                null
              if (botId && !String(botId).includes('@')) {
                botId = `${botId}@c.us`
              }
            } catch (e) {
              botId = null
            }
            const ids = chat.participants
              .map(p => {
                if (!p) return null
                if (p.id && p.id._serialized) return p.id._serialized
                if (p.id && p.id.user) return `${String(p.id.user)}@c.us`
                if (p._serialized) return p._serialized
                return null
              })
              .filter(Boolean)
              .filter(id => !botId || id !== botId)
            if (ids.length > 0) {
              finalTargetId = ids[Math.floor(Math.random() * ids.length)]
            }
          }
        }
        if (!finalTargetId) {
          await message.reply(
            'Não consegui escolher um participante automaticamente.'
          )
          return
        }
        const label = `@${String(finalTargetId).split('@')[0]}`
        await message.reply(
          `🔞 *VERDADE OU CONSEQUÊNCIA* 🔞\n\nPARTICIPANTE: ${label}`,
          undefined,
          { mentions: [finalTargetId] }
        )
        // Reabre o grupo para não-admins
        try {
          const chat = await message.getChat()
          if (
            chat &&
            chat.isGroup &&
            typeof chat.setMessagesAdminsOnly === 'function'
          ) {
            await chat.setMessagesAdminsOnly(false)
          }
        } catch (e) {}
      } catch (e) {
        try {
          await message.reply(
            'Não consegui escolher um participante automaticamente.'
          )
        } catch (err) {}
      }
    }, delayMs)
  }
}
