const dotenv = require('dotenv')
const got = require('got')
const FormData = require('form-data')
const {
  Client,
  FileContent,
  TextContent,
  WebhookController
} = require('@zenvia/sdk')

// Importa os comandos
const jogos = require('../commands/jogos')

/**
 * Webhook HTTP da Zenvia.
 *
 * Recebe eventos e responde no canal WhatsApp (via @zenvia/sdk).
 * Quando recebe um arquivo de áudio e há `AUDD_TOKEN`, tenta identificar a música.
 */

// Carrega variáveis do .env (token, porta, etc.)
dotenv.config()

const webhookPortRaw = String(
  process.env.ZENVIA_WEBHOOK_PORT || process.env.PORT || ''
).trim()
const webhookPort = webhookPortRaw ? Number(webhookPortRaw) : 3000
const webhookPortFinal = Number.isFinite(webhookPort) ? webhookPort : 3000

const apiToken = String(
  process.env.ZENVIA_TOKEN || process.env.ZENVIA_API_TOKEN || ''
).trim()

if (!apiToken) {
  console.error(
    'Token da Zenvia ausente. Defina ZENVIA_TOKEN no arquivo .env antes de iniciar.'
  )
  process.exit(1)
}

if (!String(process.env.AUDD_TOKEN || '').trim()) {
  console.warn(
    'AUDD_TOKEN ausente no .env. O webhook responderá apenas "Testado" e não identificará músicas.'
  )
}

const client = new Client(apiToken)
const whatsapp = client.getChannel('whatsapp')
global.whatsapp = whatsapp

/**
 * Integração com Audd.io: identifica música a partir de uma URL de áudio.
 * @param {string} url
 * @returns {Promise<undefined | {artist?: string, title?: string, album?: string, deezer?: {picture?: string, preview?: string}}>}
 */

// Integração com Audd.io: identifica música a partir de uma URL de áudio.
// Retorna dados básicos e, quando possível, infos do Deezer (preview/imagem).
const recognizeMusic = async url => {
  const apiToken = String(process.env.AUDD_TOKEN || '').trim()
  if (!apiToken) return undefined

  const form = new FormData()
  form.append('api_token', apiToken)
  form.append('url', url)
  form.append('return', 'deezer')

  const response = await got.post('https://api.audd.io/', {
    body: form,
    responseType: 'json',
    resolveBodyOnly: true
  })

  if (response && response.result) {
    return {
      artist: response.result.artist,
      title: response.result.title,
      album: response.result.album,
      deezer: {
        picture:
          response.result.deezer && response.result.deezer.artist
            ? response.result.deezer.artist.picture_medium
            : undefined,
        preview: response.result.deezer
          ? response.result.deezer.preview
          : undefined
      }
    }
  }

  return undefined
}

// Webhook HTTP que recebe eventos de mensagens e responde no WhatsApp.
// Comportamento:
// - padrão: responde "Testado"
// - se chegar um arquivo de áudio e AUDD_TOKEN existir: tenta identificar música
const webhookController = new WebhookController({
  channel: 'whatsapp',
  port: webhookPortFinal,
  messageEventHandler: async messageEvent => {
    console.log('Message event:', messageEvent)

    // Conteúdo padrão (fallback).
    let contents = [new TextContent('Testado')]

    try {
      const first =
        messageEvent &&
        messageEvent.message &&
        Array.isArray(messageEvent.message.contents)
          ? messageEvent.message.contents[0]
          : undefined

      const isAudioFile =
        first &&
        first.type === 'file' &&
        typeof first.fileMimeType === 'string' &&
        first.fileMimeType.includes('audio') &&
        typeof first.fileUrl === 'string' &&
        first.fileUrl.length > 0

      if (isAudioFile) {
        const music = await recognizeMusic(first.fileUrl)

        if (music) {
          let text = ''
          if (music.artist) text += `Artista: *${music.artist}*\n`
          if (music.title) text += `Título: *${music.title}*\n`
          if (music.album) text += `Álbum: *${music.album}*\n`

          contents = [new TextContent(text || 'Música identificada.')]

          if (music.deezer && music.deezer.picture) {
            contents.push(new FileContent(music.deezer.picture, 'image/jpeg'))
          }
          if (music.deezer && music.deezer.preview) {
            contents.push(new FileContent(music.deezer.preview, 'audio/mpeg'))
          }
        } else {
          contents = [
            new TextContent('Não foi possível identificar a música do áudio.')
          ]
        }
      }
    } catch (e) {
      console.error('Erro ao processar áudio:', e)
      contents = [new TextContent('Não foi possível processar o áudio.')]
    }

    return whatsapp
      .sendMessage(
        messageEvent.message.to,
        messageEvent.message.from,
        ...contents
      )
      .then(response => {
        console.debug('Response:', response)
        return response
      })
      .catch(error => {
        console.error('Send error:', error)
      })
  }
})

// Registro de comandos
const commands = {}
const commandsDir = require('path').join(__dirname, '../commands')
require('fs')
  .readdirSync(commandsDir)
  .filter(f => f.endsWith('.js'))
  .forEach(f => {
    const cmd = require(require('path').join(commandsDir, f))
    if (cmd && cmd.name && typeof cmd.execute === 'function') {
      commands[`!${cmd.name}`] = cmd.execute
    }
  })

// Atualizando a função handleCommand para incluir logs de depuração
const handleCommand = async message => {
  const command = message.contents[0].text.split(' ')[0].toLowerCase()
  console.log(`Comando recebido: ${command}`)

  if (commands[command]) {
    console.log(`Executando o comando: ${command}`)
    await commands[command]({ message })
  } else {
    console.log(`Comando não encontrado: ${command}`)
    await whatsapp.sendMessage(
      message.to,
      message.from,
      new TextContent('Comando não encontrado. Use !help')
    )
  }
}

// Atualizando o WebhookController para lidar com comandos
webhookController.messageEventHandler = async messageEvent => {
  console.log('Message event:', messageEvent)

  const firstMessage =
    messageEvent &&
    messageEvent.message &&
    Array.isArray(messageEvent.message.contents)
      ? messageEvent.message.contents[0]
      : undefined

  if (firstMessage && firstMessage.type === 'text') {
    await handleCommand(messageEvent.message)
  } else {
    await whatsapp.sendMessage(
      messageEvent.message.to,
      messageEvent.message.from,
      new TextContent('Mensagem não reconhecida.')
    )
  }
}

// Eventos de ciclo de vida do servidor webhook.
webhookController.on('listening', () => {
  console.info(`Webhook is listening on port ${webhookPortFinal}`)
})

webhookController.on('error', err => {
  try {
    const code = err && err.code
    if (code === 'EADDRINUSE') {
      console.error(
        `Webhook não conseguiu iniciar: porta ${webhookPortFinal} em uso (EADDRINUSE). Defina ZENVIA_WEBHOOK_PORT no .env para outra porta.`
      )
      return
    }
    console.error('Webhook error:', err)
  } catch (error) {
    console.error('Erro no webhook:', error)
  }
})

// Inicializa o servidor.
webhookController.init()
