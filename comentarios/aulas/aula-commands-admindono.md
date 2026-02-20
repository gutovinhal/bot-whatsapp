# Aula — Entendendo o `commands/admindono.js` (comandos do dono)

Este comando expõe ações sensíveis para o proprietário do bot.

## 1) Objetivo

- Restringir subcomandos a `OWNER_NUMBER` / `OWNER_NUMBERS`
- Permitir um pequeno subconjunto público (ex.: “chamar o dono”)

## 2) Controle de acesso

- Lê `OWNER_NUMBERS` (ou `OWNER_NUMBER`)
- Normaliza e compara apenas dígitos
- Tenta resolver o remetente via `message.getContact()` para obter número real

Se não for dono:

- permite `!dono marcar|chamar|dono`
- bloqueia o restante

## 3) Menu

Quando `!dono` é usado sem subcomando, lista um menu com:

- entrar, sair, sairtodos, anuncio
- bloquearuser, bloquearcmdglobal
- modoadmin, privadobot
- limitar, autostickerprivado
- bloqueados
- fotobot/desc/nome
- debugstats

## 4) Implementação atual

Boa parte dos subcomandos responde “ainda não implementada”.

O subcomando `debugstats` chama `runDebugStats({ message })`.

## 5) Pontos de atenção

- Qualquer subcomando “real” aqui precisa ter validações fortes
- É recomendado manter logs e evitar ações destrutivas sem confirmação
