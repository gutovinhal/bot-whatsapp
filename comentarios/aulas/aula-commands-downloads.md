# Aula — Entendendo o `commands/downloads.js` (menu de downloads)

O comando `!downloads` é um “guarda-chuva” para downloads de diferentes plataformas.

## 1) Objetivo

- Mostrar um menu com subcomandos (YouTube, Instagram, TikTok, etc.)
- Roteamento por `switch (cmd)`

## 2) Fluxo

1. `cmd = (args[0] || '').toLowerCase()`
2. Se não houver `cmd`, responde o menu (blocos com `title/desc/usage`)
3. Se houver, executa o `switch` e responde “ainda não implementada”

## 3) Ponto de atenção

- Hoje é principalmente UI/menu; a implementação real deve ser criada em arquivos próprios ou aqui
- Downloads quase sempre precisam tratar:
  - tamanho máximo
  - formatos suportados
  - rate limit
  - cache
