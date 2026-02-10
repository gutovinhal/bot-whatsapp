# Aula — Entendendo o comando `!jogos` (variáveis, helpers e cases)

Este material explica as variáveis/funções auxiliares (“helpers”) e os `case` do `switch` do comando `!jogos`, com base no arquivo `commands/jogos.js`.

## 1) Estado global do arquivo (fora do `module.exports`)

### `const sorteStates = new Map()`

- **O que é:** um `Map` (estrutura chave → valor) mantido em memória.
- **Pra que serve:** guardar, por chat, o último valor de `max` usado no subcomando `dados`.
- **Por que existe:** para que você possa usar `!jogos dados` várias vezes sem ficar repetindo o `max`.
- **Observação:** como fica em memória, se o bot reiniciar esse estado é perdido.

### `const SORTE_EXPIRY = 10 * 60 * 1000`

- **O que é:** tempo de expiração em milissegundos (aqui: 10 minutos).
- **Pra que serve:** define por quanto tempo o `sorteStates` mantém o `max` salvo para aquele chat.

## 2) Estrutura do módulo

### `module.exports = { name, description, usage, async execute(...) }`

- **O que é:** o objeto que o seu bot usa para registrar o comando.
- **Campos comuns:**
  - `name`: nome do comando (`jogos`).
  - `description`: texto de descrição.
  - `usage`: como usar.
  - `execute`: função principal que roda quando alguém envia `!jogos ...`.

## 3) Dentro do `execute({ message, args })`

### Parâmetros: `message` e `args`

- `message`: representa a mensagem recebida (de onde veio, quem mandou, menções, reply, etc.).
- `args`: array com os argumentos do comando.
  - Ex.: `!jogos testosterometro @fulano` → `args[0] = "testosterometro"`.

### `const digitsOnly = value => ...replace(/\D/g, '')`

- **O que faz:** transforma qualquer texto em “apenas dígitos”.
- **Detalhe do regex:** `\D` significa “não dígito”; com `g` remove todos.
- **Exemplos:**
  - `digitsOnly('55 31 99109-1313')` → `5531991091313`
  - `digitsOnly('5531991091313@c.us')` → `5531991091313`

### `const pickTargetId = async () => { ... }`

- **Objetivo:** descobrir _quem é o alvo_ do medidor.
- **Ordem de prioridade (importante):**
  1. **Menção**: se a mensagem tiver `@` (lista `message.mentionedIds`), pega o primeiro mencionado.
  2. **Reply (mensagem citada)**: se `message.hasQuotedMsg` for true, tenta ler `await message.getQuotedMessage()` e usar `q.author` / `q.from`.
  3. **Número digitado**: se você digitar um número depois do subcomando (ex.: `!jogos testosterometro 5531...`), ele tenta extrair e usar.
  4. **Fallback**: se nada disso existir, usa o autor da própria mensagem (`message.author` ou `message.from`).

### `const SPECIAL_TARGET_INPUT = [ ... ]` + `SPECIAL_TARGET_DIGITS`

- **O que é:** uma lista de entradas “especiais” (`SPECIAL_TARGET_INPUT`) que vira um `Set` normalizado (`SPECIAL_TARGET_DIGITS`).
- **Pra que serve:** permitir que certos alvos recebam uma faixa diferente de resultado.
- **Como adicionar mais:** inclua outra string de dígitos no array de entrada.
  - Ex.:
    - `const SPECIAL_TARGET_INPUT = ['553191091313', '5531991091313', '5511999999999']`

### `const isSpecialTarget = async id => ...SPECIAL_TARGET_DIGITS...`

- **O que faz:** resolve dígitos (quando necessário) e verifica se o alvo está na lista especial.

### `const cmd = (args[0] || '').toLowerCase()`

- **O que faz:** pega o subcomando digitado e coloca em minúsculo.
- **Exemplos:**
  - `!jogos Testosterometro` → vira `testosterometro`.
  - Se não tiver subcomando (`!jogos` puro), `cmd` fica vazio.

## 4) Menu/ajuda quando você manda só `!jogos`

### `const entries = [ ... ]`

- **O que é:** a lista que monta a mensagem de “menu” (títulos, descrição e uso).
- **Pra que serve:** mostrar os subcomandos disponíveis e como chamar.

### Montagem da mensagem

- O código monta uma string `msg` com os itens do menu.
- Depois responde no chat com `await message.reply(msg)`.

## 5) A parte principal: `switch (cmd)`

O `switch` escolhe qual “jogo” executar com base no subcomando.

### Case: `caraecoroa`

- **O que faz:** responde “Deu cara!” ou “Deu coroa!” aleatoriamente.

### Case: `viadometro`

- **O que faz:** calcula uma porcentagem.
- **Alvo:** `const targetId = await pickTargetId()`.
- **Regra especial:** se `isSpecialTarget(targetId)` for `true`, usa a faixa “alta”.
- **Faixas típicas (do jeito que seu código está):**
  - Especial: `90–100%` → `(90 + Math.random() * 10).toFixed(1)`
  - Normal: `0–100%` → `(Math.random() * 100).toFixed(1)`

### Case: `testosterometro` / `testosterômetro`

- **O que faz:** calcula uma porcentagem.
- **Alvo:** `const targetId = await pickTargetId()`.
- **Regra especial:** se `isSpecialTarget(targetId)` for `true`, usa a faixa definida no “ramo especial”.
- **Faixas típicas (depende do que você colocar no ramo):**
  - Exemplo de faixa baixa: `1–12%` → `(1 + Math.random() * 11).toFixed(1)`
  - Exemplo de faixa alta: `90–100%` → `(90 + Math.random() * 10).toFixed(1)`
  - Normal: `0–100%` → `(Math.random() * 100).toFixed(1)`

### Case: `gadometro`

- **O que faz:** porcentagem `0–100%`.

### Case: `bafometro`

- **O que faz:** mede “mg/L” de forma aleatória.

### Case: `detectormentira`

- **O que faz:** responde “Verdade!” ou “Mentira!” aleatoriamente.

### Case: `compatibilidade`

- **O que faz:** porcentagem `0–100%`.

### Case: `casal`

- **O que faz:** manda uma frase fixa.

### Case: `frasesjr`

- **O que faz:** manda uma frase fixa.

### Case: `chance`

- **O que faz:** porcentagem `0–100%`.

### Case: `top5`

- **O que faz:** manda uma lista fixa (pode ser melhorada depois se quiser).

### Case: `dados`

- **O que faz:** sorteia um número de `1` até `max`.
- **Detalhe:** guarda `max` no `sorteStates` por chat e renova/expira após `SORTE_EXPIRY`.

### Case: `ppp`

- **O que faz:** envia o texto explicando o “PPP — Pego, Penso e Passo”.

### Default

- **O que faz:** responde que o subcomando não foi reconhecido.

## 6) Dica prática: como pensar nos intervalos

- `0–100%`: `(Math.random() * 100).toFixed(1)`
- `90–100%`: `(90 + Math.random() * 10).toFixed(1)`
- `1–12%`: `(1 + Math.random() * 11).toFixed(1)`

Se quiser que **nunca** apareça exatamente `100.0`, use um intervalo com “quase 100”, ou trate o valor depois.

## 7) Exemplos práticos: como o `pickTargetId()` escolhe o alvo

O `pickTargetId()` tenta descobrir “pra quem” o comando deve calcular a %.

### Exemplo A — Com menção (@)

Mensagem:

- `!jogos testosterometro @Pedro`

O que acontece:

- `message.mentionedIds` vem com pelo menos 1 item.
- O `pickTargetId()` retorna o **primeiro mencionado**.

Quando usar:

- Quando você quer garantir o alvo sem depender de reply.

### Exemplo B — Respondendo uma mensagem (reply / quoted)

Você responde a mensagem do Pedro e manda:

- `!jogos testosterometro`

O que acontece:

- `message.mentionedIds` normalmente vem vazio.
- `message.hasQuotedMsg` é `true`.
- `await message.getQuotedMessage()` retorna a mensagem citada.
- O `pickTargetId()` retorna `q.author` (ou `q.from` como fallback).

Quando usar:

- Quando você quer que o “alvo” seja a pessoa da mensagem respondida.

### Exemplo C — Digitando o número depois do comando

Mensagem:

- `!jogos testosterometro 5531991091313`

O que acontece:

- Sem menções e sem reply, ele lê o texto após o subcomando.
- `digitsOnly(...)` extrai só dígitos.
- Se tiver pelo menos 10 dígitos, o `pickTargetId()` usa esse número como alvo.

Quando usar:

- Quando não dá pra mencionar e você não quer responder uma mensagem.

### Exemplo D — Sem menção, sem reply, sem número

Mensagem:

- `!jogos testosterometro`

O que acontece:

- Não tem menção.
- Não tem reply.
- Não tem número após o subcomando.
- O `pickTargetId()` retorna quem enviou o comando (`message.author` / `message.from`).

Quando usar:

- Quando você quer que o comando seja “sobre você mesmo”.

### Resumo do fluxo (ordem de prioridade)

1. Menção (`@`) → 2) Reply (mensagem citada) → 3) Número digitado → 4) Autor do comando

## 8) Diferença importante: “alvo” vs “quem mandou o comando”

Isso é o que mais confunde no começo.

- **Quem mandou o comando**: é a pessoa que digitou `!jogos ...`.
  - No código, isso aparece como `message.author` (em grupos) ou `message.from`.

- **Alvo do comando**: é a pessoa para quem o medidor vai calcular a %.
  - No código, é o `targetId` que vem do `await pickTargetId()`.

### Quando “alvo” e “autor” são a mesma pessoa

Mensagem:

- Você manda `!jogos testosterometro` sem mencionar e sem responder ninguém.

Resultado:

- O `pickTargetId()` cai no fallback e retorna você mesmo.

### Quando “alvo” é outra pessoa

Você tem 3 jeitos comuns:

1. **Mencionar**

- `!jogos testosterometro @Pedro`
- Autor: você
- Alvo: Pedro

2. **Responder (reply)**

- Você responde a mensagem do Pedro e manda `!jogos testosterometro`
- Autor: você
- Alvo: Pedro

3. **Digitar o número**

- `!jogos testosterometro 5531991091313`
- Autor: você
- Alvo: o número digitado

### Por que isso importa

- As regras especiais (ex.: `SPECIAL_TARGET_IDS`) são aplicadas ao **alvo**.
- Se você não mencionar nem responder, o alvo vira você, então a regra “pro Pedro” não dispara.

---

Se quiser, eu também posso adicionar uma seção mostrando como o `SPECIAL_TARGET_IDS` afeta cada subcomando (ex.: faixa especial do `testosterometro` vs faixa especial do `viadometro`).
