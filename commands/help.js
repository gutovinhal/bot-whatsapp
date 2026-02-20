const fs = require('fs')
const path = require('path')

/**
 * Comando `!help`.
 *
 * Lista comandos disponíveis em `commands/` lendo os arquivos e fazendo `require` dinâmico.
 * Contrato esperado: cada módulo exporta um objeto com `name` e, opcionalmente, `description`.
 */

module.exports = {
  name: 'help',
  description: '❓📜 Lista todos os comandos disponíveis.',

  /**
   * Handler do comando.
   * @param {{ message: any }} ctx
   */
  async execute({ message }) {
    try {
      // Pasta atual (`commands/`) onde os arquivos .js residem.
      const commandsDir = path.join(__dirname)
      const files = fs.readdirSync(commandsDir)

      // Carrega cada módulo e filtra por `cmd.name`.
      const comandosArr = files
        .filter(f => f.endsWith('.js'))
        .map(f => {
          try {
            return require(path.join(commandsDir, f))
          } catch (e) {
            return null
          }
        })
        .filter(cmd => cmd && cmd.name)
        .sort((a, b) => a.name.localeCompare(b.name))

      // Destacar !funcionalidades no topo (sem alterar o restante do layout)
      comandosArr.sort((a, b) => {
        const aKey = a && a.name === 'funcionalidades' ? 0 : 1
        const bKey = b && b.name === 'funcionalidades' ? 0 : 1
        if (aKey !== bKey) return aKey - bKey
        return a.name.localeCompare(b.name)
      })

      const lines = comandosArr.map(cmd => {
        const desc = String(cmd.description || '')
          .replace(/\s+/g, ' ')
          .trim()
        // WhatsApp lê melhor em uma linha por comando.
        return `• *!${cmd.name}* — ${desc || 'Sem descrição.'}`
      })

      const header = '*📌 Comandos disponíveis*'
      const hint = '_Dica: use_ *!admin* _ou_ *!dono* _para ver subcomandos._'
      // Espaço entre opções: usar uma linha em branco entre cada comando.
      await message.reply([header, hint, '', lines.join('\n\n')].join('\n'))
    } catch (err) {
      await message.reply('Erro ao listar comandos.')
    }
  }
}
