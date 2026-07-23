ITNEROL — pacote base a partir do backup original (2026-07-22)
=============================================================

Conteudo:
   index.html          HTML original INTACTO (sem mutacao)
   css/crm.css         CSS original INTACTO
   js/crm.js           JS original INTACTO (validado em node --check)
   js/offline.js       Stub minimo (o crm.js checa window._offlineMode)
   login.html          Tela de login nova, simples, sem bug
   data.json           Backup JSON limpo (sem metadata interna)
   manifest.json       Manifesto PWA

Credenciais (definidas em login.html):
   ADMIN        admin@itnerol.com.br    itnerol2025
   COMERCIAL    comercial@itnerol.com.br comercial123
   OPERACIONAL  CCO@ITNEROL.COM.BR      CCO2026
   VISUALIZADOR view@itnerol.com.br     view123

Por que login.html existe:
   O crm.js original (linha 41) faz
   if (!session) { window.location.href = 'login.html'; }
   O backup original nao trazia login.html, entao criamos um
   minimo, que valida contra data.json (ou BACKUP_DATA inline).

Servir localmente para teste:
   cd pasta-do-pacote
   python3 -m http.server 8080
   abrir http://localhost:8080/login.html
