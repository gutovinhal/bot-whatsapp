# Aula — Entendendo o `commands/help.js` (lista de comandos)

O comando `!help` lista os comandos disponíveis no bot lendo `commands/`.

## 1) Objetivo

- Varre arquivos `.js` dentro de `commands/`
- Faz `require()` de cada módulo
- Filtra os que exportam `name`
- Responde no WhatsApp com uma linha por comando

## 2) Fluxo

1. Descobre `commandsDir = __dirname`
2. `fs.readdirSync(commandsDir)`
3. Carrega cada arquivo com `require(path.join(commandsDir, f))`
4. Ordena e destaca `funcionalidades` no topo
5. Formata saída:

- `• *!<name>* — <description>`

6. Envia via `message.reply(...)`

## 3) Pontos de atenção

- `require()` dinâmico pode falhar se algum comando tiver erro de sintaxe
- Esse comando é “best-effort”: se um módulo falhar, ele retorna `null` e segue
