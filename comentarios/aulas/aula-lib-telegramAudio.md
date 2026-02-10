# Aula — Entendendo o `lib/telegramAudio.js` (busca e download de áudio via Telegram)

Este arquivo implementa uma integração opcional com Telegram (GramJS) para:

- buscar músicas/áudios por texto
- escolher o melhor candidato (heurística)
- baixar o áudio para um arquivo temporário

Ele expõe um export principal:

- `downloadBestTelegramAudio({ query, maxBytes })`

## 1) Carregamento lazy do GramJS

Para não quebrar o bot quando o pacote `telegram` não estiver instalado, existe um carregamento “preguiçoso”:

- `lazyLoadGramJs()` só faz `require('telegram')` quando necessário
- isso permite o bot rodar sem Telegram, desde que os comandos que dependem disso não sejam chamados

## 2) Normalização de texto e match

Há helpers para melhorar a busca:

- `cleanText()`
- `normalizeForMatch()`
  - minúsculas
  - remove acentos
  - remove pontuação
- `MATCH_STOPWORDS`: stopwords comuns (`de`, `da`, `the`, `official`, `lyrics`, etc.)
- `tokenizeForMatch()`
- `jaccardSimilarity()`

## 3) Score (heurística)

`scoreCandidate({ title, performer, fileName }, query)` calcula uma pontuação:

- título pesa mais
- performer e nome do arquivo ajudam
- bônus se a query aparece como substring no título

## 4) Busca por mensagens

A coleta de candidatos:

- varre mensagens retornadas pelo Telegram
- filtra apenas documentos que “parecem áudio”
- extrai metadados (título/performer/fileName)
- calcula score

Existem 3 estratégias de busca:

1. `searchGlobalMusic()` (global)
2. `searchMusicInPeer()` (por peer/fonte)
3. `discoverPublicPeers()` (descoberta best-effort de peers públicos)

## 5) Orquestração

`searchBestAudioAnywhere({ query })`:

- busca global
- busca nas fontes `TELEGRAM_SOURCE` (se configuradas)
- tenta descoberta pública (se permitido)
- ordena e escolhe o melhor candidato

## 6) Download

`downloadBestTelegramAudio({ query, maxBytes })`:

- aplica `TELEGRAM_MIN_MATCH_SCORE`
- valida tamanho do arquivo (`FILE_TOO_LARGE`)
- baixa para `os.tmpdir()`
- tenta montar link `t.me/<user>/<msgId>` quando possível

Retorno:

- `tmpPath`
- `title`, `artist`
- `score`
- `telegramLink` (quando disponível)

## 7) Variáveis de ambiente

- `TELEGRAM_API_ID`
- `TELEGRAM_API_HASH`
- `TELEGRAM_SESSION`
- `TELEGRAM_SOURCE`
- `TELEGRAM_ALLOW_PUBLIC_DISCOVERY`
- `TELEGRAM_PUBLIC_PEERS_LIMIT`
- `TELEGRAM_MAX_PEERS_SEARCH`
- `TELEGRAM_PER_PEER_LIMIT`
- `TELEGRAM_MIN_MATCH_SCORE`

## 8) Pontos de atenção

- A conta do Telegram precisa ter acesso aos chats/canais para achar os áudios
- Discovery público é “best-effort” e deve ser limitado
- Downloads ficam em arquivo temporário e precisam ser limpos pelo comando chamador
