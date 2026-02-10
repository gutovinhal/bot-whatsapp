# Aula — Entendendo o `commands/jogos.js` (comandos divertidos)

Este arquivo implementa o comando `!jogos` com vários subcomandos de brincadeira.

> Observação: existe uma aula mais detalhada de variáveis/helpers em `comentarios/aulas/aula-jogos-variaveis.md`.

## 1) Estado global

- `sorteStates: Map` guarda o último `max` do `!jogos dados` por chat
- `SORTE_EXPIRY` define o tempo de expiração

## 2) Objetivo do execute

Dentro de `execute({ message, args, client })` o arquivo:

- resolve alvo por menção/reply/número digitado
- lida com IDs `@lid` tentando resolver telefone real
- executa o `switch(cmd)` para cada jogo

## 3) IDs especiais

Existe uma lista `SPECIAL_TARGET_INPUT` que vira `SPECIAL_TARGET_DIGITS`.

Quando o alvo é “especial”, alguns medidores podem usar faixas diferentes.

## 4) Subcomandos mais importantes

- `caraecoroa` → aleatório
- `viadometro`, `gadometro`, `testosterometro`, `bafometro` → medidores
- `dados` → número entre 1 e N (com cache do N)
- `sortear` → sorteia um participante do grupo e menciona corretamente
- `paredao` → anuncia a dinâmica e escolhe o emparedado após um tempo (padrão 5m)

## 5) Pontos de atenção

- Menções reais precisam de `chat.sendMessage(..., { mentions })`
- IDs `@lid` podem não ser telefone; o comando tenta resolver via `client.getContactById`
