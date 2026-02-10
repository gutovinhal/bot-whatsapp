/**
 * Comando `!utilidades` (DESATIVADO).
 *
 * Este arquivo está propositalmente desativado.
 * Todo o módulo de utilidades está dentro de um comentário de bloco (um `/* ...` que só fecha no final).
 * Isso evita registrar `!utilidades` no bot enquanto as funções não estiverem prontas.
 */

/*module.exports = {
  name: 'utilidades',
  description: '🧰⚙️ Comandos de utilidades gerais.',
  usage: '*!utilidades* <subcomando> [args]',
  async execute({ message, args }) {
    const cmd = (args[0] || '').toLowerCase()
    if (!cmd) {
      const entries = [
        {
          title: '⚽ *Brasileirao*',
          desc: 'Mostra tabela/rodada do Campeonato Brasileiro.',
          usage: '*!utilidades brasileirao*'
        },
        {
          title: '🎌 *Animes / Mangas*',
          desc: 'Busca por títulos.',
          usage: '*!utilidades animes* <termo>'
        },
        {
          title: '🎬 *Tendencias*',
          desc: 'Sugestões de filmes e séries.',
          usage: '*!utilidades tendencias*'
        },
        {
          title: '🔗✂️ *Encurtar*',
          desc: 'Encurta links.',
          usage: '*!utilidades encurtar* <url>'
        },
        {
          title: '📤🖼️ *UploadImg*',
          desc: 'Faz upload de imagem e retorna link.',
          usage: 'envie imagem com legenda *!utilidades uploadimg*'
        },
        {
          title: '🎧🔊 *AudioFX*',
          desc: 'Aplica efeito em áudio.',
          usage: 'envie áudio e *!utilidades audiofx* <efeito>'
        },
        {
          title: '🗣️🔊 *TTS / STT*',
          desc: 'Texto-para-voz e voz-para-texto.',
          usage: '*!utilidades tts* <texto> | responder áudio para stt'
        },
        {
          title: '🎵📝 *Letra*',
          desc: 'Busca letra de música.',
          usage: '*!utilidades letra* <artista - música>'
        },
        {
          title: '🔊🎶 *ReconhecerMusica*',
          desc: 'Identifica música por áudio.',
          usage: 'envie áudio e *!utilidades reconhecermusica*'
        },
        {
          title: '📞 *DDD*',
          desc: 'Consulta DDD por cidade/estado.',
          usage: '*!utilidades ddd* <numero>'
        },
        {
          title: '☁️🌤️ *Clima*',
          desc: 'Consulta previsão do tempo.',
          usage: '*!utilidades clima* <cidade>'
        },
        {
          title: '💱 *Moeda*',
          desc: 'Converte valores entre moedas.',
          usage: '*!utilidades moeda* <valor> <de> <para>'
        },
        {
          title: '🧮 *Calculadora*',
          desc: 'Calcula expressões.',
          usage: '*!utilidades calculadora* 2+2*3'
        },
        {
          title: '🔎 *Pesquisa*',
          desc: 'Pesquisa na web.',
          usage: '*!utilidades pesquisa* <termo>'
        },
        {
          title: '🖼️🔍 *DetectorAnime*',
          desc: 'Identifica anime por imagem.',
          usage: 'envie imagem e *!utilidades detectoranime*'
        },
        {
          title: '📰 *Noticias*',
          desc: 'Últimas notícias por tópico.',
          usage: '*!utilidades noticias* <termo>'
        },
        {
          title: '🌐 *Tradutor*',
          desc: 'TraduZ texto.',
          usage: '*!utilidades tradutor* <pt|en|es> <texto>'
        }
      ]

      let msg =
        'Comandos de Utilidades (use: *!utilidades* <subcomando> [args])\n\n'
      for (const e of entries) {
        const titleStr = `- ${e.title}:`
        msg += `${titleStr} ${e.desc}\n`
        const indent = ' '.repeat(titleStr.length + 1)
        msg += `${indent}Uso: ${e.usage}\n\n`
      }
      msg +=
        'Algumas funções exigem APIs externas e podem precisar de chaves/configurações.'

      await message.reply(msg)
      return
    }
    switch (cmd) {
      case 'brasileirao':
        await message.reply(
          'Função de consulta do Brasileirão ainda não implementada.'
        )
        break
      case 'animes':
        await message.reply('Função de lista de animes ainda não implementada.')
        break
      case 'mangas':
        await message.reply('Função de lista de mangás ainda não implementada.')
        break
      case 'tendencias':
        await message.reply(
          'Função de tendências de filmes/séries ainda não implementada.'
        )
        break
      case 'encurtar':
        await message.reply('Função de encurtar links ainda não implementada.')
        break
      case 'uploadimg':
        await message.reply(
          'Função de upload de imagens ainda não implementada.'
        )
        break
      case 'audiofx':
        await message.reply(
          'Função de efeitos de áudio ainda não implementada.'
        )
        break
      case 'tts':
        await message.reply('Função de texto para voz ainda não implementada.')
        break
      case 'stt':
        await message.reply(
          'Função de áudio para texto ainda não implementada.'
        )
        break
      case 'letra':
        await message.reply(
          'Função de busca de letra de música ainda não implementada.'
        )
        break
      case 'reconhecermusica':
        await message.reply(
          'Função de reconhecimento de músicas ainda não implementada.'
        )
        break
      case 'ddd':
        await message.reply('Função de detector de DDD ainda não implementada.')
        break
      case 'clima':
        await message.reply(
          'Função de consulta de clima ainda não implementada.'
        )
        break
      case 'moeda':
        await message.reply(
          'Função de conversão de moedas ainda não implementada.'
        )
        break
      case 'calculadora':
        await message.reply('Função de calculadora ainda não implementada.')
        break
      case 'pesquisa':
        await message.reply('Função de pesquisa web ainda não implementada.')
        break
      case 'detectoranime':
        await message.reply(
          'Função de detector de anime ainda não implementada.'
        )
        break
      case 'noticias':
        await message.reply('Função de notícias atuais ainda não implementada.')
        break
      case 'tradutor':
        await message.reply(
          'Função de tradutor de texto ainda não implementada.'
        )
        break
      default:
        await message.reply(
          'Comando de utilidade não reconhecido. Use *!utilidades* <comando>. Exemplos: brasileirao, animes, clima, tradutor, etc.'
        )
    }
  }
}*/
