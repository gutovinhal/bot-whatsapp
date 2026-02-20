# ✅ Checklist de Testes (WhatsApp Bot)

> Objetivo: validar rapidamente se o bot está OK após mudanças.

## 0) Pré-requisitos

- [ ] Projeto está **fora de “online-only”** do OneDrive (arquivos hidratados).
- [ ] Bot está com permissão de **Admin** no grupo de teste.
- [ ] Existe um **grupo de teste** (ideal) para não impactar produção.

## 1) Subida / Instância única / Reset

- [ ] Iniciar bot (uma instância): `npm start`
- [ ] Se `npm start` retornar código `1`, conferir se já existe processo rodando e `.bot.lock` foi criado.
- [ ] Para reiniciar limpo (mata chrome/node e sobe): `npm run reset`
- [ ] Validar que **só existe 1 instância** do `node index.js` rodando.

## 2) Comando `!admin` (menu)

- [ ] Enviar `!admin` e conferir se o menu aparece com:
  - [ ] `lista`
  - [ ] `mutargrupo`
  - [ ] `bemvindo`
  - [ ] `autosticker`
  - [ ] `contagem`
  - [ ] `inativos`
  - [ ] `abrir` / `fechar`

## 3) Blacklist global — `!admin lista` + auto-add 3 bans

### 3.1 Listar / vazia

- [ ] Rodar `!admin lista` (deve listar ou dizer que está vazia).

### 3.2 Adição manual

- [ ] Marcar um usuário e rodar `!admin lista add motivo teste`
- [ ] Rodar `!admin lista` e confirmar que o usuário aparece.

### 3.3 Remoção manual

- [ ] Marcar o mesmo usuário e rodar `!admin lista remover`
- [ ] Rodar `!admin lista` e confirmar que saiu.

### 3.4 Auto-add após 3 bans

- [ ] Banir o mesmo usuário 3 vezes (ele pode precisar reentrar entre bans):
  - [ ] `!admin ban` (1)
  - [ ] `!admin ban` (2)
  - [ ] `!admin ban` (3)
- [ ] Confirmar mensagem informando inclusão automática (após o 3º).
- [ ] Rodar `!admin lista` e confirmar que o usuário aparece com `reason: auto-3-bans`.

## 4) Autoban ao entrar no grupo (blacklist global)

> Pré: o usuário precisa estar na `!admin lista`.

- [ ] Adicionar o usuário na lista (manual ou via 3 bans).
- [ ] Fazer o usuário **tentar entrar** no grupo.
- [ ] Confirmar que o bot remove automaticamente o usuário do grupo.
- [ ] Confirmar que o bot **não menciona** usuários que foram autobanidos na mensagem de boas-vindas.

## 5) MutarGrupo (bloqueio de comandos)

- [ ] Rodar `!admin mutargrupo` (toggle) e confirmar status.
- [ ] Com usuário **não-admin**, tentar rodar um comando (`!help` por exemplo):
  - [ ] Deve ser bloqueado/ignorado conforme a regra do bot.
- [ ] Com **admin**, rodar um comando e confirmar que funciona.
- [ ] Rodar `!admin mutargrupo` novamente para desativar.

## 6) AutoSticker (grupo)

- [ ] Rodar `!admin autosticker on`
- [ ] Enviar uma **imagem** no grupo (sem comando) e confirmar que o bot responde com figurinha.
- [ ] Enviar uma **imagem WEBP** (figurinha) e confirmar que o bot **não** tenta reconverter.
- [ ] Rodar `!admin autosticker off`

## 7) `!figurinhas` (funcional)

### 7.1 Foto → figurinha

- [ ] Responder uma imagem com `!figurinhas foto`

### 7.2 Vídeo/GIF → figurinha

- [ ] Responder um vídeo/gif curto com `!figurinhas video`

### 7.3 Sticker → foto (ffmpeg)

- [ ] Responder uma figurinha com `!figurinhas sticker2foto`

### 7.4 Renomear pack/autor

- [ ] Responder uma figurinha com `!figurinhas renomear MeuPack|MeuAutor`

## 8) Contagem sincronizada + participantes

- [ ] Rodar `!admin contagem` e confirmar que aparece ao final: `Participantes do grupo: X`.
- [ ] Fazer 1 pessoa entrar no grupo, mandar 1 mensagem e rodar `!admin contagem`:
  - [ ] Deve aparecer com contagem iniciando do zero a partir da entrada.
- [ ] Fazer 1 pessoa sair do grupo e rodar `!admin contagem`:
  - [ ] `Participantes do grupo: X` deve refletir a lista atual.

## 9) Inativos por dias — `!admin inativos <dias>`

- [ ] Rodar `!admin inativos 1` (ou 2/3) e validar:
  - [ ] Lista de inativos faz sentido para o grupo.
  - [ ] Se aparecer “Sem histórico”, faz sentido (pessoas sem mensagem/entrada registrada).

## 10) Abrir/Fechar grupo

- [ ] Rodar `!admin fechar` e verificar se só admins conseguem falar.
- [ ] Rodar `!admin abrir` e verificar se todos voltam a falar.

## 11) ExpulsarAuto (opcional)

- [ ] Rodar `!admin expulsarauto on 5m` (teste rápido) e aguardar.
- [ ] Confirmar que não-admins sem atividade após o limite são removidos.
- [ ] Rodar `!admin expulsarauto off` ao final do teste.

## 12) Logs e debug (se algo falhar)

- [ ] Habilitar debug de boas-vindas (opcional): definir `WELCOME_DEBUG=1` e reiniciar.
- [ ] Se Chrome travar/"já está rodando": usar `npm run reset`.

---

## Resultado do teste

- Data:
- Grupo:
- OK geral: ( ) sim ( ) não
- Observações/erros encontrados: