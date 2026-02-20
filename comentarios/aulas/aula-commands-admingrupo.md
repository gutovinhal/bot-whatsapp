# Aula — Entendendo o `commands/admingrupo.js` (administração do grupo)

Este arquivo implementa `!admin`, que concentra os subcomandos administrativos do grupo.

## 1) Responsabilidades

- Verificar permissões (somente admins)
- Marcar membros/admins (`todos`, `marcaradmins`, etc.)
- Mute/desmute (castigo) persistido em `data/mutes.json`
- Controlar toggles em `data/groupSettings.json`:
  - `bemvindo`
  - `mutargrupo`
  - `autosticker`
  - `expulsarauto`
- Interagir com blacklist/stats (em alguns subcomandos)

## 2) Persistência usada

- `blacklist.json` (lista global / contagem de bans)
- `groupSettings.json` (config do grupo)
- `mutes.json` (mute por usuário com expiração)
- `stats.json` (contagem/atividade, quando necessário)

## 3) Normalização de IDs (muito importante)

O arquivo tenta ser compatível com IDs do tipo `@lid`.

- `toDigitsId(rawId)` preserva IDs com `@` e só converte números “crus”
- `digitsOnly()` para comparações
- `computeUserKeyFromId()` tenta produzir a chave `+<digits>` (ou fallback para id)

## 4) Padrão comum de “alvo”

Vários subcomandos usam:

- menções (`message.mentionedIds`)
- reply/quoted (`message.hasQuotedMsg` + `getQuotedMessage()`)

O helper `getTargetIds()` reúne esses alvos.

## 5) Subcomandos (visão geral)

O menu do arquivo inclui ações como:

- banir/remover
- promover/rebaixar
- marcar todos/participantes/admins
- link do grupo
- mute/desmute/lista
- mutargrupo / autosticker / bemvindo / expulsarauto
- abrir/fechar grupo

## 6) Pontos de atenção

- Muitas ações exigem que o bot seja admin do grupo
- Remoção/mute pode falhar por permissão
- Em grupos com `@lid`, resolver telefone real pode exigir `client.getContactById`
- Menções reais precisam ser enviadas com `{ mentions: [...] }`
