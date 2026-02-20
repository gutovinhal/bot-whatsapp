# Aula — Entendendo o `commands/regras.js` (regras do grupo)

O comando `!regras` envia um texto fixo com as regras.

## 1) Objetivo

- Centralizar as regras do grupo em um único comando
- Facilitar o onboarding de novos membros (inclui link do Instagram)

## 2) Estrutura

- Exporta `{ name, description, usage, execute({ message }) }`
- `execute` monta um template string com o texto e responde via `message.reply(text)`

## 3) Ponto de atenção

- O texto é hardcoded: qualquer mudança de regra exige editar este arquivo
- O tamanho da mensagem no WhatsApp tem limites; se crescer muito, pode precisar dividir em partes
