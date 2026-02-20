# Aula — Entendendo o `commands/funcionalidades.js` (status do grupo)

O comando `!funcionalidades` mostra quais features estão ativas/inativas no grupo.

## 1) Objetivo

- Ler `data/groupSettings.json`
- Exibir os toggles do grupo atual
- Restringir uso a admins

## 2) Helpers

- `isEnabled(obj)` → trata `{ enabled: true }`
- `formatExpulsarAuto(cfg)` → exibe limite (minutos/horas) com fallback
- `statusLabel(active, extra)` → rótulos ✅/❌

## 3) Verificação de admin

- Normaliza IDs com `toDigitsId()` (preserva `@lid`)
- Compara `senderId` com a lista de admins em `chat.participants`

## 4) Saída

Mostra:

- Bem-vindo
- MutarGrupo
- ExpulsarAuto

Também lista itens “ainda não implementados” (presentes no menu/ideia):

- AutoSticker, AntiFake, AntiLink, AntiFlood, Filtro, Avisos, etc.

## 5) Pontos de atenção

- Alguns toggles são apenas “configurados” mas a lógica pode não existir ainda
- Em grupos com IDs `@lid`, a checagem de admin depende do payload do `whatsapp-web.js`
