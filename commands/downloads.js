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

    // Importação dinâmica dos subcomandos
    const subcommands = {}
    const subcommandsList = [
      'youtube',
      'facebook',
      'instagram',
      'x',
      'tiktok',
      'google'
    ]
    for (const sub of subcommandsList) {
      try {
        subcommands[sub] = require(`./downloads/${sub}`)
      } catch (e) {
        // ignora erro de importação
      }
    }
    if (subcommands[cmd]) {
      await subcommands[cmd]({ message, args })
    } else {
      await message.reply(
        '❌ Comando não reconhecido.\nUse: *!downloads* <youtube|facebook|instagram|x|tiktok|google> <url|termo>'
      )
    }
  }
}
