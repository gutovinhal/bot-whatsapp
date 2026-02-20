# Comentários do Projeto

Use este arquivo para anotar ideias, mudanças, pendências e observações do bot.

## Pendências

-

## Mudanças realizadas

- ✅ Boas-vindas: handler mais robusto para detectar participantes adicionados (inclui `recipientIds`).
- ✅ IDs: preservação de sufixos `@...` (inclui `@lid`) para evitar falhas em menções/promover/rebaixar/expulsar.
- ✅ Expulsão automática: `!admin expulsarauto on|off` com suporte a duração curta para teste (`5m`, `48h`, `2d`).
- ✅ Contagem: agora é _desde a entrada_ (baseline por usuário) para não contabilizar mensagens antigas de quem já participou antes.
- ✅ Debug opt-in: `WELCOME_DEBUG=1` mostra payload do evento de entrada quando necessário.
- ✅ `!jogos dados`: renomeado do antigo `!jogos sorte` (cache de `max` mantido).
- ✅ `!jogos paredao`: anuncia a dinâmica e escolhe o emparedado após tempo (padrão 5m, ajustável).

## Observações

- ***

## ✅ Rodar 24/7 no Windows (definitivo)

### Pré-requisitos

- De preferência, mova o projeto para fora do OneDrive (evita problemas de sync/lock com sessão/cache):
  - Ex.: `C:\bots\Bot WhatsApp\`
- Node.js LTS instalado.
- Para o webhook da Zenvia ser utilizável “de verdade”, ele precisa de URL pública com HTTPS (porta exposta + reverse proxy, ou túnel).

### Modo produção com auto-restart (PM2)

1. Instale o PM2 globalmente:

- `npm i -g pm2`

2. Suba os 2 processos (bot + webhook) via ecosystem:

- `npm run pm2:start`

3. Salve o estado (necessário para ressuscitar no boot):

- `npm run pm2:save`

4. Logs:

- `npm run pm2:logs`
- Arquivos: `data/logs/*.log`

### Setup automatizado

- Instala/configura tudo (PM2 + auto-start):
  - `npm run setup:24x7`
- Remove tudo (PM2 + auto-start):
  - `npm run remove:24x7`

### Iniciar com o Windows (2 alternativas)

**Alternativa A (mais simples): PM2 como Serviço**

- Use um wrapper de serviço no Windows (ex.: `pm2-windows-service`) e configure para executar `pm2 resurrect` no boot.
- Observação: normalmente requer PowerShell/Prompt como Administrador para instalar o serviço.

**Alternativa B (muito confiável): NSSM (2 serviços separados)**

- Crie 2 serviços:
  - Serviço 1: `node index.js` (bot principal)
  - Serviço 2: `node src/index.js` (webhook Zenvia)
- Configure o “Startup directory” como a pasta do projeto (para o `.env` ser carregado).

### Dicas importantes

- Primeira execução do bot exige leitura do QR. Depois, a sessão fica em `.wwebjs_auth/`.
- Se o webhook ficar reiniciando sem parar, verifique se `ZENVIA_TOKEN` e `AUDD_TOKEN` estão no `.env` (o webhook encerra com erro se `ZENVIA_TOKEN` estiver ausente).
- Evite rodar múltiplas instâncias: o bot tem um lock em `.bot.lock` e sai com code 1 se detectar outro PID ativo.
