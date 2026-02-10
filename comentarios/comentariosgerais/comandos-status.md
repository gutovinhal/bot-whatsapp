# Status dos Comandos

## ✅ Comandos funcionais

- 🧭 `!help`
  - Permissão: **todos**
  - 📜 Lista os comandos disponíveis.

- ⚙️ `!funcionalidades`
  - Permissão: **admin do grupo**
  - 📌 Mostra o que está ativo/inativo no grupo (com base nas configurações do grupo) e o que ainda não foi implementado.

- 📜 `!regras`
  - Permissão: **todos**
  - 📌 Envia as regras do grupo.

- 🎮 `!jogos <subcomando>`
  - Permissão: **todos**
  - 🪙 `caraecoroa`
  - 🌈 `viadometro`
  - 💪 `testosterometro`
  - 🐂 `gadometro`
  - 🍻 `bafometro`
  - 🕵️ `detectormentira`
  - 💞 `compatibilidade`
  - 💑 `casal`
  - 💬 `frasesjr`
  - 🎯 `chance`
  - 🏆 `top5`
  - 🎲 `dados [max]` (define/inferre o max e mantém por ~10 min no chat)
  - 🎯 `ppp`
  - 🔥 `paredao` (anuncia a dinâmica e escolhe o emparedado após um tempo)

- 🎵 `!play <pesquisa>`
  - Permissão: **todos**
  - 🔎 Busca no YouTube e envia o áudio quando possível.
  - 🔁 Usa `ytdl` e fallback `yt-dlp` (com opção de MP3 via `PLAY_FORCE_MP3`).

- 🖼️ `!figurinhas <subcomando>`
  - Permissão: **todos**
  - ✅ `foto`: responda/mande imagem e use `!figurinhas foto` → envia figurinha.
  - ✅ `video` / `gif`: responda/mande vídeo/GIF curto e use `!figurinhas video`.
  - ✅ `sticker2foto`: responda figurinha e use `!figurinhas sticker2foto`.
    - Obs.: depende de `ffmpeg` (no projeto via `ffmpeg-static`).
  - ✅ `renomear <pack>|<autor>`: responda mídia e use `!figurinhas renomear`.
  - ✅ `auto on|off`: toggle do autosticker (alternativa ao `!admin autosticker`).
  - ⏸️ `emojimix`: em standby.

- 🛡️ `!admin <subcomando>`
  - Permissão: **admin do grupo**
  - 🔇 `mute <min>`: aplica castigo (1–120 min) no usuário marcado/respondido.
  - 🔊 `desmute`: remove o castigo do usuário marcado/respondido.
  - 🗑️ `ban`: remove do grupo o usuário marcado/respondido (bot precisa ter permissão). (alias: `banir`)
  - 👑 `promover`: promove a admin o usuário marcado/respondido.
  - ⬇️ `rebaixar`: remove admin do usuário marcado/respondido (não rebaixa dono/superadmin).
  - 📢 `todos`: menciona/lista todos do grupo.
  - 🔗 `link`: obtém o link de convite do grupo (quando suportado/permissões ok).
  - 🔕 `mutargrupo`: toggle (também aceita `on|off`) — bloqueia comandos para não-admins quando ligado.
  - 👋 `bemvindo on|off`: ativa/desativa mensagem de boas-vindas.
  - 🚫📛 `lista`: gerencia a lista (blacklist) _global_ do bot.
    - `!admin lista`: mostra itens
    - `!admin lista add`: adiciona (marcando/respondendo)
    - `!admin lista remover`: remove (marcando/respondendo)
    - Automático: ao banir o mesmo número 3x, ele entra na lista.
    - Autoban: se alguém da lista entrar em qualquer grupo, o bot remove automaticamente.
  - 📊 `contagem`: mostra contagem _desde a entrada_ e última atividade (mensagem ou entrada) + total de participantes.
  - ♻️ `contagem zerar|reset`: zera a contagem do grupo.
  - 🚪 `expulsar`: remove não-admins inativos há 48h (com histórico conhecido).
  - 🤖🚪 `expulsarauto on|off [duração]`: ativa/desativa expulsão automática no grupo (ex.: `5m`, `48h`, `2d`).
  - 💤 `inativos <dias>`: lista participantes com última atividade há X dias (sem expulsar).
  - 🔓 `abrir` (alias `abrirgrupo`): libera mensagens para todos (se suportado).
  - 🔒 `fechar` (alias `fechargrupo`): somente admins falam (se suportado).
  - 🤖🖼️ `autosticker on|off`: liga/desliga criação automática de figurinha ao enviar mídia no grupo.

- 👑 `!dono <subcomando>`
  - 🌐 (público) `marcar|chamar|dono` (ou `!dono` sem args): mostra/manda contato do dono.
  - 🔎 (dono) `debugstats`: mostra debug do `stats.json` e participantes do grupo.
  - 🖼️ (dono) `fotobot`: altera a foto do bot (enviar/responder uma imagem).
  - 📝 (dono) `descbot <texto>`: altera o recado/descrição.
  - ✏️ (dono) `nomebot <nome>`: altera o nome do perfil.

## ⛔ Comandos não funcionais / em standby

- ⬇️ `!downloads <subcomando>`
  - `youtube`, `facebook`, `instagram`, `x`, `tiktok`, `google`

- 🛡️ `!admin <subcomando>`
  - `marcarparticipantes`, `marcaradmins`, `linkgrupo`, `resetlink`, `donogrupo`,
    `antifake`, `antilink`, `antiflood`, `filtro`, `avisos`, `ranking`,
    `bloquearcmd`, `apagar`

- 👑 `!dono <subcomando>` (somente dono)
  - `entrar`, `sair`, `sairtodos`, `anuncio`, `bloquearuser`, `bloquearcmdglobal`, `modoadmin`,
    `privadobot`, `limitar`, `autostickerprivado`, `bloqueados`, `promoveruser`

- 🧰 `!utilidades`
  - Não carrega (arquivo está comentado; comando não existe em runtime).
