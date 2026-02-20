# Aula — Entendendo o `index.js` (roteamento, stats, automações e boas-vindas)

Este material explica o arquivo `index.js`, que é o **entry-point** do bot do `whatsapp-web.js`.

## 1) Responsabilidades do arquivo

O `index.js` concentra:

- Inicialização do cliente do WhatsApp (`Client` + `LocalAuth`)
- Carregamento dinâmico de comandos em `commands/`
- Persistência simples em JSON (via `lib/storage.js`)
- Rate limit de comandos por usuário (via `lib/rateLimiter.js`)
- Automações por grupo:
  - `mutargrupo` (bloqueia comandos de não-admin)
  - `autosticker` (transforma mídia em figurinha automaticamente)
  - `expulsarauto` (expulsão automática de inativos)
  - `bemvindo` (mensagem de boas-vindas com menções)
  - `blacklist` (autoban ao entrar)
- Integração opcional com LLM local via Ollama (`sendToLLM`)

## 2) Persistência (arquivos em `data/`)

O arquivo lê/escreve principalmente:

- `data/stats.json`
  - Contagem de mensagens por chat
  - `lasts`: último timestamp por usuário
  - `joins`: timestamp de entrada
  - `baselines`: contagem “a partir da entrada”

- `data/groupSettings.json`
  - Flags/objetos por grupo: `bemvindo`, `autosticker`, `mutargrupo`, `expulsarauto`, etc.

- `data/mutes.json`
  - “castigo” por usuário, com expiração

- `data/blacklist.json`
  - Lista global para autoban

## 3) Normalização de IDs (ponto crítico)

O bot lida com IDs que podem aparecer como:

- `5511999999999@c.us`
- `5511999999999@s.whatsapp.net`
- `...@lid` (IDs “novos” que nem sempre são o telefone)

Por isso existem helpers como:

- `toDigitsParticipantId(rawId)`
  - Se já tem `@`, **preserva**
  - Se for só dígitos, vira `<digits>@c.us`

- `digitsOnly(s)`
- `phoneKeyFromId(id)`
  - Constrói chave de stats no formato `+<digits>`

A ideia é: **quando possível**, stats/blacklist/mutes usam `+<telefone>`.

## 4) Carregamento de comandos (`commands/`)

O arquivo varre `commands/*.js` e registra em `commands: Map`.

Cada comando deve exportar algo como:

```js
module.exports = {
  name: 'help',
  execute: async ({ message, args, client }) => {}
}
```

## 5) Rate limit

`RateLimiter({ tokens: 5, interval: 60_000 })` limita **5 comandos por minuto por usuário**.

Isso roda somente quando o texto começa com `!`.

## 6) Handler principal de mensagens (`message_create`)

Fluxo alto nível:

1. Ignora mensagens do próprio bot (`message.fromMe`)
2. Atualiza stats em `stats.json`
3. Enforça mute por usuário (apaga mensagem quando possível)
4. Enforça `mutargrupo` (não-admin não executa comandos)
5. Executa `autosticker` quando habilitado e a mensagem tem mídia
6. Se a mensagem for comando (`!`): parseia e chama `cmd.execute(...)`

## 7) Expulsão automática de inativos (`runAutoKickInactive`)

Quando `expulsarauto.enabled=true` em um grupo:

- Calcula um `cutoff = now - duration` (default 48h)
- Para cada participante não-admin:
  - tenta achar a melhor chave no stats (`lasts`/`joins`)
  - se a última atividade <= cutoff: remove

A execução roda em loop, com intervalo ajustado pelo menor limite configurado.

## 8) Boas-vindas + blacklist (autoban)

O handler `handleWelcomeEvent(notification)`:

- Extrai `chatId` e participantes adicionados
- Em saída/remoção (`remove`/`leave`): limpa chaves do stats
- Em entrada (`add`/`join`/`invite`):
  - registra `joins` e baseline
  - aplica `blacklist.json` (remove bloqueados)
  - se `bemvindo.enabled`: envia mensagem, tentando mencionar corretamente

Ponto importante: **para notificar** menções, o envio é feito com:

```js
chat.sendMessage(texto, { mentions: [...] })
```

## 9) Variáveis de ambiente relevantes

- `OLLAMA_API`
- `DEBUG_JOGOS`
- `WELCOME_DEBUG`
- `AUTO_KICK_INTERVAL_MINUTES`
- `STICKER_PACK`, `STICKER_AUTHOR`
- `FFMPEG_PATH` (dependente de features de conversão)

## 10) Pontos de atenção

- `@lid` exige cuidado: nem sempre representa o telefone real
- JSONs crescem com o tempo: vale ter rotação/limites se o bot ficar 24x7
- Remoção de participantes pode falhar sem permissão de admin do bot
