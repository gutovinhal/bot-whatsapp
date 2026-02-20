const { TextContent } = require('@zenvia/sdk')
const path = require('path')
const fs = require('fs')

function getMessageText(message) {
  if (message.body) return message.body
  if (message.text) return message.text
  if (message.content && message.content.text) return message.content.text
  return ''
}

module.exports = {
  name: 'jogos',
  description:
    '🎲 Lista todos os jogos disponíveis ou executa um jogo específico.',
  async execute({ message }) {
    // Extrai os argumentos do texto da mensagem (corrigido)
    const text = getMessageText(message)
    const args = text ? text.trim().split(/\s+/) : []
    const subcomando = args[1] ? String(args[1]).toLowerCase() : null
    console.log('[JOGOS] args:', args, 'subcomando:', subcomando)
    if (subcomando) {
      // Busca arquivo de jogo pelo campo 'name' exportado OU pelo nome do arquivo
      const jogosDir = path.join(__dirname, 'jogos')
      const files = fs.readdirSync(jogosDir).filter(f => f.endsWith('.js'))
      console.log('[JOGOS] Arquivos encontrados:', files)
      for (const file of files) {
        try {
          const jogo = require(path.join(jogosDir, file))
          const fileName = file.replace(/\.js$/, '').toLowerCase()
          const exportName = jogo && jogo.name ? jogo.name.toLowerCase() : null
          console.log(
            `[JOGOS] Testando arquivo: ${file} | fileName: ${fileName} | exportName: ${exportName}`
          )
          if (
            (exportName && exportName === subcomando) ||
            fileName === subcomando
          ) {
            if (typeof jogo.execute === 'function') {
              console.log(
                '[JOGOS] Executando subcomando:',
                subcomando,
                'arquivo:',
                file
              )
              return await jogo.execute({ message, args })
            } else {
              console.log(
                '[JOGOS] Jogo encontrado mas não possui função execute:',
                file
              )
            }
          }
        } catch (e) {
          console.error(
            '[JOGOS] Erro ao tentar executar subcomando',
            subcomando,
            'em',
            file,
            e
          )
        }
      }
      console.log('[JOGOS] Nenhum subcomando encontrado para:', subcomando)
    }

    // Lista de jogos
    const jogosInfo = [
      {
        title: '🫢 *Secrets*',
        desc: '*Envie e receba mensagens anônimas.*',
        comando: '*!jogos secrets*'
      },

      {
        title: '🔞 *Verdade ou Consequência*',
        desc: '*Jogo de Verdade ou Consequência.*',
        comando: '*!jogos vec*'
      },

      {
        title: '🎤 *Me cante*',
        desc: '*Jogo de cantadas.*',
        comando: '*!jogos mecante*'
      },

      {
        title: '💪 *Testosterômetro*',
        desc: '*Mede a testosterona.*',
        comando: '*!jogos testosterometro*'
      },

      {
        title: '🔍 *DetectorMentira*',
        desc: '*Responde aleatoriamente Verdade/Mentira.*',
        comando: '*!jogos detectormentira*'
      },

      {
        title: '💑 *Compatibilidade / Casal*',
        desc: '*Mede compatibilidade entre dois usuários.*',
        comando: '*!jogos compatibilidade*'
      },

      {
        title: '💬 *FrasesJR*',
        desc: '*Envia uma frase aleatória engraçada.*',
        comando: '*!jogos frasesjr*'
      },

      {
        title: '🎲 *Chance*',
        desc: '*Calcula porcentagem de chance.*',
        comando: '*!jogos chance*'
      },

      {
        title: '🏆 *Top5*',
        desc: '*Gera um top 5 aleatório no tema.*',
        comando: '*!jogos top5*'
      },

      {
        title: '🎲 *Dados*',
        desc: '*Sorteia um número entre 1 e N (defina N).*',
        comando: '*!jogos dados*'
      },

      {
        title: '🎯 *Sortear*',
        desc: '*Sorteia um usuário do grupo e responde com uma frase.*',
        comando: '*!jogos sortear*'
      },

      {
        title: '🧱 *Paredão*',
        desc: '*Sorteia pessoas para o paredão do grupo.*',
        comando: '*!jogos paredao*'
      },

      {
        title: '🖐️ *PPP*',
        desc: '*Jogo do Pego, Penso e Passo.*',
        comando: '*!jogos ppp*'
      },

      {
        title: '📊 *Bafômetro*',
        desc: '*Mede o nível de álcool no sangue.*',
        comando: '*!jogos bafometro*'
      },

      {
        title: '📊 *Gadômetro*',
        desc: '*Mede o nível de gado de um usuário.*',
        comando: '*!jogos gadometro*'
      },

      {
        title: '📊 *Viadômetro*',
        desc: '*Mede o nível de viadagem de um usuário.*',
        comando: '*!jogos viadometro*'
      },

      {
        title: '🪙 *Cara ou Coroa*',
        desc: '*Sorteia cara ou coroa.*',
        comando: '*!jogos caraecoroa*'
      }
    ]

    let response = '*Jogos disponíveis:*\n\n'
    response += jogosInfo
      .map(
        jogo =>
          `- ${jogo.title}: ${jogo.desc}.\n         Comando: ${jogo.comando}`
      )
      .join('\n\n')

    if (global.whatsapp) {
      await global.whatsapp.sendMessage(
        message.to,
        message.from,
        new TextContent(response)
      )
    } else if (typeof message.reply === 'function') {
      await message.reply(response)
    }
  }
}
