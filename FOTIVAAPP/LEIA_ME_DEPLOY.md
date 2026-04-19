# FOTIVA v3.0 — Deploy Completo com Stripe
# Multi-tenant + Stripe + Cupons + Admin Panel

=======================================================
DIFERENÇA DA VERSÃO ANTERIOR
=======================================================

Esta versão usa STRIPE no lugar do MercadoPago.

Vantagens do Stripe:
- Painel mais profissional e completo
- Portal do cliente nativo (o fotógrafo cancela sozinho)
- Renovação automática com eventos de webhook confiáveis
- Suporte a cartão de crédito/débito internacional
- Dashboard de receita, churn, MRR embutido

Desvantagem:
- Não tem PIX nativo (use Stripe + integração PIX separada se precisar)
- Taxa um pouco maior (~3,6% no Brasil)


=======================================================
PASSO 1 — BANCO DE DADOS (MongoDB Atlas)
=======================================================

1. Acesse: https://mongodb.com/atlas
2. Crie conta gratuita → "Build a Database" → Free M0
3. Região: São Paulo (sa-east-1)
4. Crie usuário: fotiva / [sua senha]
5. Network Access → "Allow from Anywhere" (0.0.0.0/0)
6. Connect → Drivers → copie a connection string:
   mongodb+srv://fotiva:SENHA@cluster0.xxxxx.mongodb.net/


=======================================================
PASSO 2 — CONFIGURAR O STRIPE
=======================================================

1. Acesse: https://stripe.com e crie conta
2. Vá em Developers → API Keys
3. Copie a "Secret key" (começa com sk_live_ ou sk_test_)

CRIAR OS PRODUTOS (planos):

4. No painel Stripe → Products → Add product
5. Crie o Plano Normal:
   - Name: Fotiva Normal
   - Price: R$29,90 / Monthly (recorrente)
   - Currency: BRL
   - Salvar → copie o "Price ID" (price_xxxxxxx)

6. Crie o Plano PRO:
   - Name: Fotiva PRO
   - Price: R$39,90 / Monthly
   - Salvar → copie o "Price ID"

CONFIGURAR WEBHOOK:

7. Developers → Webhooks → Add endpoint
8. URL: https://fotiva-backend.onrender.com/api/webhook/stripe
9. Selecione esses eventos:
   - checkout.session.completed
   - invoice.payment_succeeded
   - invoice.payment_failed
   - customer.subscription.deleted
   - customer.subscription.updated
10. Salvar → copie o "Signing secret" (whsec_...)

CONFIGURAR PORTAL DO CLIENTE:

11. Settings → Billing → Customer portal
12. Ative as opções: cancelar, trocar plano, ver faturas
13. Salvar


=======================================================
PASSO 3 — BACKEND NO RENDER
=======================================================

1. Render.com → New → Web Service → seu repositório
2. Configure:
   - Name: fotiva-backend
   - Root Directory: backend
   - Runtime: Node
   - Build Command: npm install
   - Start Command: node server.js

3. Environment Variables — adicione TODAS:

   MONGO_URL               = mongodb+srv://fotiva:SENHA@cluster.mongodb.net/
   DB_NAME                 = fotiva
   JWT_SECRET              = [frase longa aleatória, min 32 chars]
   CORS_ORIGINS            = https://fotiva-frontend.onrender.com
   ANTHROPIC_API_KEY       = sk-ant-...
   STRIPE_SECRET_KEY       = sk_live_...
   STRIPE_WEBHOOK_SECRET   = whsec_...
   STRIPE_PRICE_NORMAL     = price_...  (ID do plano Normal)
   STRIPE_PRICE_PRO        = price_...  (ID do plano PRO)
   ADMIN_EMAIL             = seu@email.com
   ADMIN_PASSWORD          = [senha forte]
   FRONTEND_URL            = https://fotiva-frontend.onrender.com
   BACKEND_URL             = https://fotiva-backend.onrender.com
   PORT                    = 10000

4. Create Web Service → aguarde "Live" (3-5 min)
5. Teste: https://fotiva-backend.onrender.com/api/health


=======================================================
PASSO 4 — CRIAR CONTA ADMIN (UMA VEZ SÓ)
=======================================================

Após o backend estar no ar, envie esta requisição:

POST https://fotiva-backend.onrender.com/api/admin/setup
Content-Type: application/json

{
  "secret": "[seu JWT_SECRET]",
  "email": "[seu ADMIN_EMAIL]",
  "password": "[seu ADMIN_PASSWORD]",
  "name": "Admin Fotiva"
}

Use o Insomnia, Postman ou curl:
curl -X POST https://fotiva-backend.onrender.com/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"secret":"sua_jwt_secret","email":"seu@email.com","password":"sua_senha","name":"Admin"}'

Resposta esperada: {"message":"Admin criado","id":"..."}
(Esse endpoint só funciona uma vez — depois bloqueia)


=======================================================
PASSO 5 — FRONTEND NO RENDER
=======================================================

1. Render → New → Static Site
2. Configure:
   - Name: fotiva-frontend
   - Root Directory: frontend
   - Build Command: npm install && npm run build
   - Publish Directory: build

3. Environment Variables:
   REACT_APP_BACKEND_URL = https://fotiva-backend.onrender.com

4. Create Static Site → aguarde build (5-8 min)
5. URL: https://fotiva-frontend.onrender.com

LANDING PAGE:
A landing page já está em frontend/public/fotiva-landing.html
Após o deploy, acesse:
https://fotiva-frontend.onrender.com/fotiva-landing.html


=======================================================
PASSO 6 — MANTER BACKEND ACORDADO
=======================================================

O Render gratuito dorme após 15min sem uso.

1. Acesse: https://cron-job.org
2. Crie conta gratuita
3. Novo job:
   URL: https://fotiva-backend.onrender.com/api/health
   Frequência: a cada 10 minutos
4. Salvar


=======================================================
PASSO 7 — TESTAR PAGAMENTO
=======================================================

No modo teste do Stripe, use estes cartões:
- Aprovado:  4242 4242 4242 4242 | CVV: qualquer | Venc: qualquer data futura
- Recusado:  4000 0000 0000 0002
- Requer 3D: 4000 0025 0000 3155

Fluxo:
1. Cadastre um fotógrafo de teste
2. Trial de 7 dias começa automaticamente
3. Após trial → redireciona para /assinatura
4. Clica "Assinar" → vai para checkout Stripe
5. Paga com cartão de teste
6. Retorna para /pagamento/sucesso
7. Dashboard liberado com plano ativo

Portal do cliente (cancelar/trocar plano):
- Configurações → botão "Gerenciar assinatura"
- Abre o portal nativo do Stripe


=======================================================
CUPONS DE DESCONTO
=======================================================

Crie cupons via API (use Postman/Insomnia):

POST https://fotiva-backend.onrender.com/api/coupons
Authorization: Bearer [token do admin]
Content-Type: application/json

Cupom de 50% de desconto:
{
  "code": "LANCAMENTO50",
  "description": "50% de desconto no lançamento",
  "type": "percent",
  "value": 50,
  "maxUses": 100,
  "validUntil": "2026-12-31",
  "plans": ["normal", "pro"]
}

Cupom de R$10 fixo:
{
  "code": "DESCONTO10",
  "type": "fixed",
  "value": 10,
  "maxUses": null
}

O cupom é aplicado diretamente na sessão Stripe.


=======================================================
PAINEL ADMIN
=======================================================

Acesse: https://fotiva-frontend.onrender.com/admin
Login: ADMIN_EMAIL / ADMIN_PASSWORD

O painel mostra:
- Total de fotógrafos cadastrados
- Quantos estão com plano ativo (pagos)
- Quantos estão no trial
- MRR (receita mensal recorrente)
- Lista de todos os fotógrafos com filtros
- Alterar plano manualmente
- Bloquear usuário


=======================================================
RESUMO DE CUSTOS
=======================================================

MongoDB Atlas Free M0:    R$0/mês
Render Backend Free:      R$0/mês (dorme se não usar cron)
Render Frontend Free:     R$0/mês (static site)
Stripe:                   0% setup + ~3,6% por transação
Anthropic (IA):           ~$0.003 por mensagem
                          ─────────────────────
TOTAL FIXO:               R$0/mês

Upgrade recomendado quando tiver receita:
→ Render Starter $7/mês: elimina o sleep do backend


=======================================================
VARIÁVEIS DE AMBIENTE — RESUMO
=======================================================

BACKEND:
  MONGO_URL               Connection string MongoDB
  DB_NAME                 fotiva
  JWT_SECRET              Chave secreta JWT (min 32 chars)
  CORS_ORIGINS            URL do frontend
  ANTHROPIC_API_KEY       Chave Claude AI
  STRIPE_SECRET_KEY       sk_live_... ou sk_test_...
  STRIPE_WEBHOOK_SECRET   whsec_... (do painel Stripe)
  STRIPE_PRICE_NORMAL     price_... (ID do produto Normal)
  STRIPE_PRICE_PRO        price_... (ID do produto PRO)
  ADMIN_EMAIL             Seu email de admin
  ADMIN_PASSWORD          Sua senha de admin
  FRONTEND_URL            URL do frontend (redirect Stripe)
  BACKEND_URL             URL do próprio backend
  PORT                    10000

FRONTEND:
  REACT_APP_BACKEND_URL   URL do backend


=======================================================
ESTRUTURA DO PROJETO
=======================================================

fotiva/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── models/
│   │   ├── User.js       (com stripeCustomerId e stripeSubId)
│   │   ├── models.js     (Client + Event)
│   │   └── Coupon.js
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       ├── clients.js
│       ├── events.js
│       ├── payments.js
│       ├── dashboard.js
│       ├── chat.js
│       ├── push.js
│       ├── subscription.js   ← Stripe Checkout + Portal
│       ├── webhook.js        ← Stripe Webhook (5 eventos)
│       ├── coupons.js
│       └── admin.js
│
└── frontend/
    ├── package.json
    ├── .env.example
    ├── public/
    │   ├── index.html
    │   ├── manifest.json
    │   └── fotiva-landing.html  ← Landing page de vendas
    └── src/
        ├── App.js
        ├── index.css
        ├── lib/api.js
        ├── contexts/AuthContext.js
        ├── components/
        │   ├── Layout.jsx
        │   └── Assistente.jsx
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx
            ├── Eventos.jsx
            ├── NovoEvento.jsx
            ├── EditarEvento.jsx
            ├── Clientes.jsx
            ├── Pagamentos.jsx
            ├── Agenda.jsx
            ├── Configuracoes.jsx
            ├── Assinatura.jsx       ← Stripe Checkout + cupom
            ├── PagamentoRetorno.jsx ← Retorno pós-pagamento
            └── Admin.jsx            ← Painel administrativo
