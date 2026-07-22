# ITNEROL — Sistema Comercial

CRM estático para a ITNEROL. Funciona 100% no navegador, offline depois do primeiro acesso, sem dependência de backend (zero consumo de créditos em plataformas pagas).

## 🚀 Hospedagem no GitHub Pages (5 minutos)

1. **Crie um repositório no GitHub** chamado `itnerol-crm` (ou o nome que preferir). Pode ser **privado** ou **público** — GitHub Pages é grátis para ambos.

2. **Suba os arquivos** desta pasta (`index.html`, `app.js`, `data.js`, `sw.js`, `manifest.json`, `README.md`) para a raiz do repositório. Pelo próprio navegador:
   - clique em **Add file → Upload files**
   - arraste todos os arquivos da pasta
   - clique **Commit changes**

3. **Ative o GitHub Pages**:
   - **Settings** → **Pages**
   - Em **Source**, escolha **Deploy from a branch**
   - **Branch**: `main`, pasta `/ (root)`
   - Clique **Save**

4. **Aguarde ~30 segundos**. A URL será:
   ```
   https://SEU_USUARIO.github.io/itnerol-crm/
   ```

5. **Abra a URL no navegador**. O sistema carrega com o backup embarcado e fica disponível **mesmo sem internet** depois da primeira visita.

## 🔐 Perfis de login (já configurados)

| Perfil | E-mail | Senha |
|---|---|---|
| ADMIN | admin@itnerol.com.br | itnerol2025 |
| COMERCIAL | comercial@itnerol.com.br | comercial123 |
| OPERACIONAL | CCO@ITNEROL.COM.BR | CCO2026 |
| VISUALIZADOR | view@itnerol.com.br | view123 |

Para alterar senhas, edite o array `usuarios` em `data.js` e faça commit. Ou entre como ADMIN e modifique pela rotina de gerenciamento (em breve).

## ✏️ Como atualizar o sistema

### Mudar dados dos usuários
Edite o array `usuarios` em `data.js`. Cada commit é uma nova versão.

### Adicionar/alterar módulos do CRM
Edite o arquivo `app.js` ou `data.js`, faça commit e a URL do GitHub Pages já entrega a nova versão no próximo acesso.

### Adicionar dados reais
Acesse o sistema logado como ADMIN → **Relatórios / Backup** → **Importar Backup JSON** carrega seu arquivo de backup ITNEROL.

### Restaurar backup
**Relatórios / Backup** → **Backup Completo (JSON)** baixa um snapshot com TODOS os dados (clientes, veículos, motoristas, contratos, linhas, apuração, prospecções, propostas, reclamações + usuários + metadados).

### Para mudar completamente o app
1. Edite `app.js` (lógica) e/ou `data.js` (dados iniciais) e/ou `index.html` (visual)
2. Faça commit e push
3. A URL pública continua a mesma — todos que acessarem verão a nova versão automaticamente

## 🛡️ Segurança & Continuidade

- **Nada chama servidor externo** — todos os dados ficam em `localStorage` do navegador.
- **Service Worker** (sw.js) cacheia HTML/JS/CSS/CDNs → funciona offline após primeiro acesso.
- **Backup JSON** pode ser baixado a qualquer momento → portabilidade total.
- **PWA instalável** — no Chrome/Edge aparece ícone "Instalar app" na barra de endereço.
- **GitHub Pages é gratuito** e estável → sem risco de cair ou cobrar.

## 📂 Estrutura de arquivos

```
├── index.html       ← entrada do sistema (HTML + CSS embutido)
├── app.js           ← lógica completa do CRM
├── data.js          ← dados seed + perfis de usuário
├── sw.js            ← Service Worker (cache offline)
├── manifest.json    ← PWA manifest (instalação)
└── README.md        ← este arquivo
```

## 🔄 Migração de versão 6.x → 7.4

O novo formato JSON (compatível com seu backup 2026-07-22) tem um campo `dados` agrupando todas as tabelas:

```json
{
  "versao": "7.4",
  "sistema": "ITNEROL Sistema Comercial",
  "data_backup": "2026-07-22T14:28:35.667Z",
  "dados": {
    "clientes": [...],
    "veiculos": [...],
    "motoristas": [...],
    "contratos": [...],
    "linhas": [...],
    "apuracao": [...],
    "prospeccoes": [...],
    "propostas": [...],
    "reclamacoes": [...],
    "usuarios": [...]
  }
}
```

O sistema lê essa estrutura e mantém compatibilidade com backups antigos.
