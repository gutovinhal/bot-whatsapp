# Aula — Entendendo o `commands/debugstats.js` (debug de stats.json)

Este arquivo não é um comando público direto; ele exporta um helper:

- `runDebugStats({ message })`

Ele é chamado pelo comando do dono (`!dono debugstats`).

## 1) Objetivo

Ajudar a diagnosticar o conteúdo do `data/stats.json` no grupo atual:

- quais participantes atuais existem no stats
- quanto cada um tem
- quais chaves “sobraram” no stats mas não são mais participantes

## 2) Chave de usuários

O código normaliza IDs para:

- `+<apenas-dígitos>`

Isso facilita comparar com `entry.users`.

## 3) Fluxo

1. Garante que é grupo (`chat.isGroup`)
2. Lê `stats.json`
3. Determina `chatId` (fallback `message.from || message.author`)
4. Para cada participante:
   - extrai dígitos
   - forma `key = +<digits>`
   - lê contador em `users[key]`
5. Calcula extras:
   - chaves no stats que não aparecem no grupo atual

## 4) Ponto de atenção

- O `chatId` precisa bater com a chave usada no stats
- Contadores dependem do fluxo de atualização no `index.js`
