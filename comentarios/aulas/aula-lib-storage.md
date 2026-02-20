# Aula — Entendendo o `lib/storage.js` (persistência simples em JSON)

O `lib/storage.js` centraliza a persistência simples em JSON dentro de `data/`.

## 1) Diretório base

- `dataDir = <raiz>/data`

## 2) `ensureDataDir()`

Garante que:

- a pasta `data/` existe
- os arquivos mínimos existam (com JSON vazio se não existirem)

Arquivos criados:

- `blacklist.json`
- `stats.json`
- `groupSettings.json`
- `mutes.json`

## 3) `readJSON(name)`

- Lê o arquivo `data/<name>`
- Retorna `null` se o arquivo não existir

## 4) `writeJSON(name, data)`

- Grava `data/<name>` com `JSON.stringify(data, null, 2)`
- Identação facilita debug manual

## 5) Ponto de atenção

- Não valida schema: qualquer conteúdo inválido pode quebrar `JSON.parse`
- Se o bot estiver 24x7, esses JSONs podem crescer; pode valer rotação/limites
