# Aula — Entendendo o `lib/rateLimiter.js` (anti-spam de comandos)

O `RateLimiter` é um limitador simples em memória baseado em **token bucket** por chave.

## 1) Ideia geral

- Cada usuário (ou chave) tem um “saldo” de tokens.
- Cada comando consome tokens.
- A cada `interval`, os tokens “recarregam”.

## 2) Construtor

```js
new RateLimiter({ tokens: 5, interval: 60000 })
```

- `tokens`: quantos comandos (por intervalo) são permitidos
- `interval`: janela em ms

## 3) `tryRemoveTokens(key, count = 1)`

- Retorna `true` se permitiu
- Retorna `false` se excedeu

Fluxo:

1. Busca a entrada da `key` no `Map`
2. Calcula quanto tempo passou desde `last`
3. Faz refill proporcional aos intervalos completos que passaram
4. Se tiver saldo: desconta e permite

## 4) Ponto de atenção

- O estado é **em memória**: reiniciar o bot “zera” o limiter
- Se rodar em múltiplos processos, cada processo tem seu próprio limiter
