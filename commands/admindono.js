const fs = require('fs')
const path = require('path')
const os = require('os')
const { runDebugStats } = require('./debugstats')

/**
 * Comando `!dono`.
 *
 * Ações administrativas globais e sensíveis do bot.
 * Por padrão, restringe acesso ao número configurado em `OWNER_NUMBERS`/`OWNER_NUMBER`.
 */

// Comando de dono do bot.
// Observação: este arquivo expõe subcomandos sensíveis (administração global).
// Por padrão, restringe acesso ao número configurado em `OWNER_NUMBER`.
module.exports = {
  name: 'dono',
  description:
    '👑 Comandos administrativos do dono (entrar, sair, bloquear usuários, etc).',
  usage: '*!dono* <subcomando> [args]',

  /**
   * Handler do comando.
   * @param {{ message: any, args: string[], client: any }} ctx
   */
  async execute({ message, args, client }) {
    // Restrição: somente o dono pode usar estes comandos.
    // Importante: o número é comparado por dígitos para tolerar variações.
    const OWNER_NUMBERS_RAW =
      process.env.OWNER_NUMBERS || process.env.OWNER_NUMBER || '553198463410'
    const ownerDigitsList = String(OWNER_NUMBERS_RAW)
      .split(/[\s,;]+/)
      .map(s => String(s || '').replace(/\D/g, ''))
      .filter(Boolean)

    const primaryOwnerDigits = ownerDigitsList[0] || '553198463410'
    let senderDigits = null
    try {
      const contact = await message.getContact()
      const preferred =
        (contact && (contact.number || (contact.id && contact.id.user))) || ''
      const d = String(preferred).replace(/\D/g, '')
      if (d) senderDigits = d
    } catch (e) {
      // ignore
    }
    if (!senderDigits) {
      const raw = (message.author || message.from || '')
        .toString()
        .split('@')[0]
      const digits = String(raw).replace(/\D/g, '')
      if (digits) senderDigits = digits
    }
    const isOwner =
      !!senderDigits &&
      ownerDigitsList.some(ownerDigits => {
        return (
          senderDigits === ownerDigits ||
          senderDigits.endsWith(ownerDigits) ||
          ownerDigits.endsWith(senderDigits)
        )
      })

    // Quando não é dono, permite um subconjunto público apenas para “chamar o dono”.
    if (!isOwner) {
      // Permitir uso público para marcar/contatar o dono do bot
      const publicCmd = (args[0] || '').toLowerCase()
      if (
        !publicCmd ||
        publicCmd === 'marcar' ||
        publicCmd === 'chamar' ||
        publicCmd === 'dono'
      ) {
        const ownerId = `${primaryOwnerDigits}@c.us`
        try {
          if (client && typeof client.getContactById === 'function') {
            const contact = await client.getContactById(ownerId)
            const chatRef = await message.getChat()
            const mentionId = ownerId
            if (chatRef && typeof chatRef.sendMessage === 'function') {
              // Uma única mensagem: nome em texto + menção para notificar (evita duplicar)
              const displayPlain =
                (contact && (contact.pushname || contact.name)) ||
                primaryOwnerDigits
              const phoneDigits = String(
                (contact && contact.number) || primaryOwnerDigits
              ).replace(/\D/g, '')
              const phoneDisplay = phoneDigits
                ? `+${phoneDigits}`
                : `+${primaryOwnerDigits}`
              const text = `Dono do bot: ${String(displayPlain)} (${phoneDisplay}) @${primaryOwnerDigits}`
              await chatRef.sendMessage(text, { mentions: [mentionId] })
              return
            }
          }
        } catch (e) {
          // silent fallback
        }
        // fallback textual (mostrar número)
        await message.reply(`Dono do bot: +${primaryOwnerDigits}`)
        return
      }

      // Qualquer outro subcomando permanece bloqueado.
      await message.reply(
        'Acesso negado: comando disponível apenas ao dono do bot.'
      )
      return
    }

    // Roteamento de subcomandos.
    const cmd = (args[0] || '').toLowerCase()
    if (!cmd) {
      const entries = [
        {
          title: '🔗 *Entrar*',
          desc: 'Faz o bot entrar em um grupo via link/convite.',
          usage: '*!dono entrar* <link>'
        },
        {
          title: '🚪 *Sair*',
          desc: 'Faz o bot sair do grupo atual.',
          usage: '*!dono sair*'
        },
        {
          title: '🚪⚠️ *SairTodos*',
          desc: 'Faz o bot sair de todos os grupos (perigoso).',
          usage: '*!dono sairtodos* confirm'
        },
        {
          title: '📢 *Anuncio*',
          desc: 'Envia um anúncio para todos os grupos do bot.',
          usage: '*!dono anuncio* <mensagem>'
        },
        {
          title: '🔒 *BloquearUser*',
          desc: 'Bloqueia/desbloqueia um usuário do bot.',
          usage: '*!dono bloquearuser* <+55119...> on|off'
        },
        {
          title: '🚫 *BloquearCmdGlobal*',
          desc: 'Bloqueia comandos globalmente.',
          usage: '*!dono bloquearcmdglobal* <comando> on|off'
        },
        {
          title: '🛡️ *ModoAdmin*',
          desc: 'Alterna modo administrador (só aceita comandos de admins).',
          usage: '*!dono modoadmin* on|off'
        },
        {
          title: '🔐 *PrivadoBot*',
          desc: 'Ativa/desativa resposta a mensagens privadas.',
          usage: '*!dono privadobot* on|off'
        },
        {
          title: '⏱️ *Limitar*',
          desc: 'Ajusta limites por usuário (ex: comandos por minuto).',
          usage: '*!dono limitar* <comando> <n>'
        },
        {
          title: '🤖🖼️ *AutoStickerPrivado*',
          desc: 'Ativa stickers automáticos no privado.',
          usage: '*!dono autostickerprivado* on|off'
        },
        {
          title: '📛 *Bloqueados*',
          desc: 'Lista usuários bloqueados.',
          usage: '*!dono bloqueados*'
        },
        {
          title: '🖼️✏️ *FotoBot / DescBot / NomeBot*',
          desc: 'Atualiza foto/descrição/nome do bot.',
          usage: 'responder mídia para foto ou *!dono nomebot* NovoNome'
        },
        {
          title: '🎖️ *PromoverUser*',
          desc: 'Promove um usuário no contexto do sistema (se aplicável).',
          usage: '*!dono promoveruser* <+55119...>'
        },
        {
          title: '🔎 *DebugStats*',
          desc: 'Mostra debug do stats.json e participantes do grupo (apenas dono).',
          usage: '*!dono debugstats*'
        }
      ]

      const validEntries = entries.filter(
        e => e && e.title && e.desc && e.usage
      )

      const header = ['*👑 Admin do Dono*', 'Use: *!dono* <subcomando> [args]']
      const blocks = validEntries.map(e => {
        return [`${e.title}`, `• ${e.desc}`, `• Uso: ${e.usage}`].join('\n')
      })
      const footer =
        '_Obs:_ comandos de dono só funcionam para o proprietário configurado; use com cuidado.'

      // Espaço entre opções: um bloco por entrada, separado por linha em branco.
      await message.reply(
        [...header, '', ...blocks, footer].join('\n\n').trim()
      )
      return
    }
    // Importação dinâmica dos subcomandos
    const subcommands = {}
    const subcommandsList = [
      'debugstats',
      'entrar',
      'sair',
      'sairtodos',
      'anuncio',
      'bloquearuser',
      'bloquearcmdglobal',
      'modoadmin',
      'privadobot',
      'limitar',
      'autostickerprivado',
      'bloqueados',
      'fotobot',
      'descbot',
      'nomebot',
      'promoveruser'
    ]
    for (const sub of subcommandsList) {
      try {
        subcommands[sub] = require(`./admindono/${sub}`)
      } catch (e) {
        // ignora erro de importação
      }
    }
    if (subcommands[cmd]) {
      await subcommands[cmd]({ message, args, client })
    } else {
      await message.reply(
        'Comando de administração do dono não reconhecido. Use *!dono* <subcomando>'
      )
    }
  }
}
