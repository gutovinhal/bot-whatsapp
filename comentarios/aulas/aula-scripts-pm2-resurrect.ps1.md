# Aula — Entendendo o `scripts/pm2-resurrect.ps1` (restaurar PM2)

Este script é um helper para restaurar o estado salvo do PM2.

## 1) O que ele faz

- Garante que `pm2` existe no PATH
- Roda `pm2 resurrect`

## 2) Quando usar

- Manualmente, depois de reboot
- Via tarefa agendada (logon)

## 3) Ponto de atenção

- `pm2 resurrect` depende de existir um dump salvo (`pm2 save`)
