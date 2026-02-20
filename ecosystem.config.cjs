// Configuração do PM2.
// Define quais processos o PM2 deve manter em execução e onde salvar logs.

module.exports = {
  apps: [
    {
      // Processo principal do bot (whatsapp-web.js)
      name: 'bot-whatsapp',
      script: 'index.js',
      cwd: __dirname,
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 30,
      watch: false,
      time: true,
      env: {
        NODE_ENV: 'production',
        DEBUG_JOGOS: '0'
      },
      env_debug: {
        NODE_ENV: 'production',
        DEBUG_JOGOS: '1'
      },
      out_file: 'data/logs/bot-whatsapp.out.log',
      error_file: 'data/logs/bot-whatsapp.err.log',
      merge_logs: true
    },
    {
      // Webhook da Zenvia (usa @zenvia/sdk) para receber eventos do WhatsApp Cloud/Zenvia
      name: 'zenvia-webhook',
      script: 'src/index.js',
      cwd: __dirname,
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 30,
      watch: false,
      time: true,
      env: {
        NODE_ENV: 'production',
        DEBUG_JOGOS: '0'
      },
      env_debug: {
        NODE_ENV: 'production',
        DEBUG_JOGOS: '1'
      },
      out_file: 'data/logs/zenvia-webhook.out.log',
      error_file: 'data/logs/zenvia-webhook.err.log',
      merge_logs: true
    }
  ]
}
