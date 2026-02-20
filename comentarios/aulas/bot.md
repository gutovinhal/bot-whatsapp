# Como Gerenciar a VM e o Bot WhatsApp (Ubuntu/Oracle Cloud)

ssh -i "C:\Users\augus\OneDrive\Área de Trabalho\ALL\Dev\Bot WhatsApp\oraclekey.key" ubuntu@64.181.178.176



## 1. Iniciar a VM com seu login

1. **Acesse o painel da Oracle Cloud**  
   Entre em [cloud.oracle.com](https://cloud.oracle.com/) com seu usuário e senha.

2. **Vá até "Compute" > "Instances"**  
   Localize sua VM (ex: `vcin-bot-whatsapp`).

3. **Inicie a VM**  
   Se ela estiver parada, clique em "Start" ou "Iniciar".

4. **Acesse via SSH**  
   No terminal do seu PC, conecte usando:
   ```sh
   ssh ubuntu@<IP_DA_VM>
   ```
   Substitua `<IP_DA_VM>` pelo IP público da sua VM.

---

## 2. Comandos úteis para gerenciar o bot

### Verificar status do bot

```sh
pm2 status
```

Mostra se o bot está rodando (`online`).

### Reiniciar o bot

```sh
pm2 restart bot-whatsapp
```

Reinicia o processo do bot.

### Parar o bot

```sh
pm2 stop bot-whatsapp
```

Para o bot (ele não responderá até ser iniciado novamente).

### Iniciar o bot manualmente

```sh
pm2 start bot-whatsapp
```

Inicia o bot caso esteja parado.

### Ver logs do bot em tempo real

```sh
pm2 logs bot-whatsapp
```

Acompanha as mensagens e erros do bot ao vivo.

### Ver todos os logs (todos os processos)

```sh
pm2 logs
```

### Remover o bot do PM2

```sh
pm2 delete bot-whatsapp
```

Remove o processo do PM2 (não apaga arquivos do bot).

---

## 3. Garantir que o bot inicie automaticamente após reboot

Execute estes comandos **apenas uma vez**:

```sh
pm2 startup
pm2 save
```

Assim, o PM2 e o bot iniciam automaticamente quando a VM for reiniciada.

---

## 4. Comandos para gerenciar a VM

### Reiniciar a VM

```sh
sudo reboot
```

### Desligar a VM

```sh
sudo poweroff
```

### Verificar uso de recursos (CPU, memória, disco)

```sh
htop
```

Se não tiver instalado, instale com:

```sh
sudo apt update && sudo apt install htop
```

### Ver espaço em disco

```sh
df -h
```

---

## 5. Dicas rápidas

- **Desligar seu PC não afeta o bot**: O bot roda na nuvem, não depende do seu computador.
- **Sempre use SSH para acessar a VM**.
- **Mantenha sua chave SSH segura** para não perder o acesso.

---

**Qualquer dúvida, consulte este arquivo ou peça ajuda!**
