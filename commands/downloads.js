/**
 * Comando "guarda-chuva" de downloads.
 *
 * Atualmente atua como menu/roteador; os subcomandos ainda estão em implementação.
 */

module.exports = {
  name: 'downloads',
  description:
    '⬇️ Comandos para baixar vídeos, áudios e imagens de diversas plataformas.',
  usage:
    '*!downloads* <youtube|facebook|instagram|x|tiktok|google> <url|termo>',

  /**
   * Handler do comando.
   * @param {{ message: any, args: string[] }} ctx
   */
  async execute({ message, args }) {
    // `cmd` define qual plataforma/subcomando o usuário solicitou.
    const cmd = (args[0] || '').toLowerCase()
    if (!cmd) {
      const entries = [
        {
          title: '▶️ *Youtube*',
          desc: 'Baixa vídeo/áudio do YouTube.',
          usage: '*!downloads youtube* <url>'
        },
        {
          title: '📘 *Facebook*',
          desc: 'Baixa vídeo do Facebook.',
          usage: '*!downloads facebook* <url>'
        },
        {
          title: '📸 *Instagram*',
          desc: 'Baixa mídia do Instagram (post/reel).',
          usage: '*!downloads instagram* <url>'
        },
        {
          title: '🐦 *X*',
          desc: 'Baixa mídia do X (ex-Twitter).',
          usage: '*!downloads x* <url>'
        },
        {
          title: '🎵 *TikTok*',
          desc: 'Baixa vídeo do TikTok.',
          usage: '*!downloads tiktok* <url>'
        },
        {
          title: '🔍 *Google*',
          desc: 'Busca e baixa imagens do Google.',
          usage: '*!downloads google* <termo ou url>'
        }
      ]

      const validEntries = entries.filter(
        e => e && e.title && e.desc && e.usage
      )

      const header = [
        '*⬇️ Downloads*',
        'Use: *!downloads* <subcomando> <url|termo>'
      ]
      const blocks = validEntries.map(e => {
        return [`${e.title}`, `• ${e.desc}`, `• Uso: ${e.usage}`].join('\n')
      })

      // Espaço entre opções: um bloco por entrada, separado por linha em branco.
      await message.reply([...header, '', ...blocks].join('\n\n').trim())
      return
    }

    switch (cmd) {
      case 'youtube':
        await message.reply(
          'Função de download do YouTube (vídeo/áudio) ainda não implementada.'
        )
        break
      case 'facebook':
        await message.reply(
          'Função de download do Facebook (vídeo) ainda não implementada.'
        )
        break
      case 'instagram':
        await message.reply(
          'Função de download do Instagram (vídeo/imagem) ainda não implementada.'
        )
        break
      case 'x':
        await message.reply(
          'Função de download do X (vídeo/imagem) ainda não implementada.'
        )
        break
      case 'tiktok':
        await message.reply(
          'Função de download do TikTok (vídeo) ainda não implementada.'
        )
        break
      case 'google':
        await message.reply(
          'Função de busca e download de imagem do Google ainda não implementada.'
        )
        break
      default:
        await message.reply(
          '❌ Comando não reconhecido.\nUse: *!downloads* <youtube|facebook|instagram|x|tiktok|google> <url|termo>'
        )
    }
  }
}
