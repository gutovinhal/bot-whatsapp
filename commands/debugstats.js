const { readJSON } = require('../lib/storage')

/**
 * Helper `runDebugStats`.
 *
 * Não registra um comando público por padrão; ele é importado por outros comandos
 * (ex.: `!dono debugstats`) para gerar um relatório do `stats.json`.
 */

// Converte uma string para apenas dígitos.
// Ex.: "+55 (11) 98888-7777" -> "5511988887777"
function digitsOnly(s) {
  return String(s || '').replace(/\D/g, '')
}

/**
 * Executa um "debug" do arquivo de estatísticas (stats.json) para o grupo atual.
 *
 * O objetivo é ajudar a identificar:
 * - quais participantes atuais do grupo existem no stats.json;
 * - qual contador cada um tem registrado;
 * - chaves que existem no stats.json mas não são mais participantes do grupo.
 *
 * Observação importante sobre as chaves em stats.json:
 * - este código tenta normalizar cada participante para o formato "+<apenas-dígitos>";
 * - isso facilita comparar e exibir as entradas em `entry.users`.
 */
async function runDebugStats({ message }) {
  try {
    // Obtém o chat atual via API do cliente (ex.: whatsapp-web.js)
    const chat = await message.getChat()
    if (!chat || !chat.isGroup) {
      // Segurança: não faz sentido debugar stats de "grupo" em chat privado.
      await message.reply('Este comando só pode ser usado em grupos.')
      return
    }

    // Lê as estatísticas persistidas.
    // Estrutura esperada (aproximada):
    // stats[chatId] = { total: number, users: { "+551199...": number, ... } }
    const stats = readJSON('stats.json') || {}

    // Identificador do chat/grupo (depende da origem: from/author).
    // Mantemos fallback para cobrir diferentes tipos de mensagens.
    const chatId = message.from || message.author || ''

    // Entrada do grupo atual dentro do stats.json.
    // Se não existir, usa default para evitar exceções.
    const entry = stats[chatId] || { total: 0, users: {} }

    // Mapa de contadores por usuário, indexado por chave normalizada (ex.: "+551199..."
    const users = entry.users || {}

    // Lista de participantes atuais do grupo.
    const participants = chat.participants || []

    // Monta a mensagem de saída do debug.
    let msg = `🔍 Debug stats para chat: ${chatId}\nTotal registrado: ${entry.total || 0}\n\nParticipantes atuais:\n`
    for (const p of participants) {
      // Extrai o id numérico do participante (quando disponível) e normaliza.
      const digits = digitsOnly((p && p.id && p.id.user) || '')
      const key = digits ? `+${digits}` : null

      // Busca o contador registrado para o participante no stats.json.
      const cnt = key ? Number(users[key]) || 0 : 0

      // Exibe um identificador amigável: preferencialmente os dígitos do user.
      const idShow = digits || (p && p.id && p.id._serialized) || '[sem id]'
      msg += `- ${idShow}: ${cnt}${key ? ` (key: ${key})` : ''}\n`
    }

    // Coleta as chaves dos participantes atuais para comparar com `users`.
    // Assim dá pra achar entradas “sobrando” no stats.json.
    const currentKeys = new Set(
      participants
        .map(p => {
          const d = digitsOnly((p && p.id && p.id.user) || '')
          return d ? `+${d}` : null
        })
        .filter(Boolean)
    )

    // Identifica chaves registradas no stats.json que não correspondem a ninguém do grupo.
    const extra = Object.keys(users).filter(k => !currentKeys.has(k))
    if (extra.length > 0) {
      msg += `\nEntradas em stats.json sem ser participante atual:\n`

      // Limita a quantidade para não estourar tamanho de mensagem.
      for (const k of extra.slice(0, 80)) msg += `- ${k}: ${users[k]}\n`
      if (extra.length > 80) msg += `- ... (+${extra.length - 80})\n`
    }

    // Responde no grupo com o relatório.
    await message.reply(msg)
  } catch (e) {
    // Loga no console do servidor e responde algo curto para o usuário.
    console.error('Erro em debugstats:', e)
    await message.reply('Erro ao executar debugstats.')
  }
}

// Exporta como helper para ser chamado pelo comando de dono/admin.
// Não exporta `name` para evitar registrar automaticamente como comando `!debugstats`.
module.exports = { runDebugStats }
