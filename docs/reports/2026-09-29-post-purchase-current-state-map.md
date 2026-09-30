# Mapeamento atual do pós-compra

Data do levantamento: 2026-09-29

Este documento descreve o comportamento existente antes das próximas alterações. Ele não propõe ainda o fluxo futuro.

## 1. Visão geral

O pós-compra atual é dividido em três mecanismos independentes:

1. **Pagamento**: XPayments é a fonte de verdade para confirmar ou rejeitar o pagamento.
2. **Fulfilment/rastreio**: uma linha do tempo interna simula a evolução logística a partir do horário do pagamento.
3. **Comunicação**: somente a transição inicial para pagamento confirmado dispara um e-mail próprio da aplicação.

Fluxo principal:

```text
Checkout
  -> Order: CHECKOUT_DRAFT / PENDING_PAYMENT
  -> PaymentIntent na XPayments
  -> confirmação no provedor
       -> webhook assinado
       -> consulta da página de sucesso
       -> consulta do endpoint de status
       -> endpoint interno de reconciliação
  -> Order: CONFIRMED / PAID
  -> baixa de estoque
  -> geração de rastreio interno
  -> e-mail de pagamento confirmado
  -> evento payment_paid para analytics
```

## 2. Estados persistidos

### 2.1 Pagamento da encomenda (`Order.paymentStatus`)

| Estado | Origem/uso atual | Terminal para a página de status |
| --- | --- | --- |
| `PENDING_PAYMENT` | Checkout criado ou provedor ainda aguardando pagamento | Não |
| `PAYMENT_PROCESSING` | Provedor informa processamento assíncrono | Não |
| `PAID` | Provedor confirmou `SUCCEEDED` e valor/moeda conferem | Sim |
| `PAYMENT_FAILED` | Provedor informou falha | Sim |
| `CANCELLED` | PaymentIntent cancelado | Sim |
| `REFUNDED` | Reembolso total concluído | Sim |
| `PARTIALLY_REFUNDED` | Reembolso parcial ou reembolso ainda não classificado como total concluído | Sim |

Não existe enum no Prisma; os estados são strings distribuídas pelo código.

### 2.2 Estado operacional (`Order.status`)

```text
CHECKOUT_DRAFT
  -> CONFIRMED
  -> PROCESSING
  -> SHIPPED
  -> IN_TRANSIT
  -> OUT_FOR_DELIVERY
  -> DELIVERED
```

`PENDING` e `CANCELLED` também são aceitos pelo admin. Não existe uma máquina de estados central que valide todas as transições ou impeça regressões manuais.

### 2.3 Estado do registro de pagamento (`Payment.status`)

O registro técnico do pagamento usa estados do provedor, como:

```text
CREATED
REQUIRES_PAYMENT_METHOD
REQUIRES_ACTION
PROCESSING
SUCCEEDED
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

Esse estado e `Order.paymentStatus` representam conceitos diferentes, embora sejam atualizados no mesmo fluxo de reconciliação.

## 3. Criação do checkout

Entrada: `POST /api/checkout/create`.

- Recalcula produtos, descontos, frete e total no servidor.
- Não confia nos totais recebidos do navegador.
- Usa `checkoutToken` para reutilizar o mesmo rascunho.
- Permite um rascunho sem contato completo, mas exige contato antes da confirmação do pagamento.
- Cria a encomenda como `CHECKOUT_DRAFT / PENDING_PAYMENT`.
- Gera `orderNumber`, `accessToken` e `pricingHash`.
- O `accessToken` é necessário para consultas privadas posteriores.
- Consentimento de marketing é persistido separadamente e não bloqueia o checkout.

Entrada seguinte: `POST /api/payments/create-intent`.

- Exige `orderNumber + accessToken`.
- Valida novamente a encomenda e o preço.
- Cria ou reutiliza um PaymentIntent compatível.
- Persiste `Payment` e a referência do intent na `Order`.
- Entrega ao navegador apenas os dados necessários para confirmar o pagamento.

## 4. Confirmação e reconciliação do pagamento

Toda confirmação converge em `applyProviderIntent()`.

### 4.1 Gatilhos existentes

| Gatilho | Comportamento |
| --- | --- |
| `POST /api/webhooks/xpayments` | Valida HMAC, deduplica em `WebhookEvent`, recupera o PaymentIntent e aplica o estado |
| Página `/checkout/success` | Se o estado não for terminal, consulta a XPayments no carregamento do servidor |
| `GET /api/payments/status` | A página de sucesso consulta a cada 4 segundos; estados não terminais são reconciliados |
| `GET /api/internal/payments/reconcile` | Endpoint protegido por `CRON_SECRET`; revisa até 60 pagamentos pendentes dos últimos 7 dias |

Existe o endpoint preparado para cron, mas não foi encontrado `vercel.json` ou outro agendamento versionado no repositório. Portanto, o código sozinho não comprova que ele roda automaticamente em produção.

### 4.2 Regras aplicadas quando o provedor confirma sucesso

1. Confere PaymentIntent, valor e moeda.
2. Exige dados completos de contato para um checkout pago.
3. Atualiza `Payment` para `SUCCEEDED`.
4. Faz uma disputa atômica para mudar `Order.paymentStatus` para `PAID`.
5. Define `Order.status = CONFIRMED`.
6. Registra `paidAt`, método e dados iniciais de rastreio.
7. Baixa estoque uma única vez usando `Order.stockApplied`.
8. Somente a requisição que venceu a transição para `PAID` tenta enviar o e-mail.
9. Emite `payment_paid` para o serviço externo de analytics, que deduplica pelo número da encomenda.

Uma encomenda paga ou reembolsada não é rebaixada por uma leitura atrasada do provedor.

## 5. Fulfilment e rastreio

### 5.1 Dados gerados após o pagamento

- `trackingNumber`: código determinístico no formato `ECC-YYMM-XXXXXX`.
- `carrier`: valor fixo `3PL EU Logistics Partner`.
- `originWarehouse`: Zaragoza para PT/ES/IT/GR/MT/CY/HR; Venlo para os demais mercados.
- `estimatedDeliveryAt`: calculado pelo relógio interno.

Não há criação real de expedição nem consulta a transportadora/3PL.

### 5.2 Linha do tempo simulada

| Estado | Standard | Express |
| --- | ---: | ---: |
| `CONFIRMED` | 0h | 0h |
| `PROCESSING` | 4h | 4h |
| `SHIPPED` | 24h | 12h |
| `IN_TRANSIT` | 30h | 18h |
| `OUT_FOR_DELIVERY` | 72h | 36h |
| `DELIVERED` | 96h | 48h |

Os eventos vencidos são gravados em `TrackingEvent` e `Order.status` avança quando `ensureTracking()` é chamado. Isso ocorre ao ler:

- a página de sucesso;
- `GET /api/orders`;
- `GET /api/tracking`.

Não foi encontrado job em segundo plano para o fulfilment. Sem uma leitura, o relógio pode ter avançado, mas os eventos e o estado persistido ainda não terão sido materializados.

### 5.3 Consulta pública

`GET /api/tracking?code=...` procura apenas o código de rastreio. A resposta evita e-mail, nome e endereço completo, mas inclui cidade, país, itens, armazém e linha do tempo.

### 5.4 Intervenção pelo admin

O detalhe da encomenda permite:

- escolher manualmente qualquer estado operacional listado;
- editar código de rastreio, transportadora, origem e previsão;
- executar reembolso total ou parcial.

Limites atuais:

- fulfilment não avança antes de pagamento verificado;
- uma encomenda `PAID` precisa ser reembolsada antes de ser cancelada;
- alteração manual não cria um `TrackingEvent`, exceto para cancelamento;
- alteração manual não dispara comunicação;
- o formulário permite regressão operacional, por exemplo de `DELIVERED` para `PROCESSING`.

## 6. Comunicação ao cliente

### 6.1 E-mail implementado

Existe apenas `sendPaymentConfirmedEmail()` via API do Resend.

| Campo | Valor atual |
| --- | --- |
| Gatilho | Primeira transição atômica para `PAID` |
| Remetente | `E-com.casa <orders@e-com.casa>` |
| Reply-to | `support@e-com.casa` |
| Assunto | `Payment confirmed — {orderNumber}` |
| Idioma | Inglês fixo |
| Conteúdo | Nome, número da encomenda, total, rastreio, botão e dados jurídicos |
| Configuração | `RESEND_API_KEY` |

O template HTML e o texto simples estão embutidos diretamente em `src/lib/email/order-email.ts`.

### 6.2 Comunicações não implementadas

Não foram encontrados disparos próprios para:

- pagamento pendente;
- pagamento falhou;
- encomenda em preparação;
- encomenda expedida;
- em trânsito;
- saiu para entrega;
- entregue;
- cancelada;
- reembolso total ou parcial;
- fatura ou nota de crédito.

Textos públicos dizem que haverá e-mail de expedição e atualizações por e-mail, mas esses envios não existem no fluxo atual.

### 6.3 Falhas e reenvio

- Não existe tabela de mensagens, outbox, fila ou estado de entrega.
- Não existe reenvio automático nem botão de reenvio no admin.
- Ausência de `RESEND_API_KEY` apenas registra aviso e não bloqueia a compra.
- Erro da API do Resend é registrado, mas não desfaz o pagamento.
- Como somente a primeira transição para `PAID` envia, uma reconciliação futura normalmente não recupera um e-mail que falhou.

### 6.4 Defeito conhecido no link

O e-mail monta `/track?number=...`, mas a página e a API esperam `code`. O formato usado no restante da aplicação é `/track?code=...`. Atualmente, o botão abre a página sem executar automaticamente a busca correta.

## 7. Reembolsos, faturas e notas de crédito

- Reembolso é iniciado manualmente no admin e executado na XPayments.
- O fluxo cria `Refund`, atualiza `Payment`, atualiza `Order.paymentStatus` e cria `CreditNote`.
- Não existe e-mail de reembolso.
- O schema possui `Invoice`, mas não foi encontrado fluxo de emissão de fatura na confirmação do pagamento.
- A página de sucesso e o histórico exibem uma fatura somente se algum processo externo já tiver criado o registro.

## 8. Dados e responsabilidades

| Modelo | Responsabilidade atual |
| --- | --- |
| `Order` | Cliente, endereço, itens, totais, estados de pagamento/fulfilment e rastreio atual |
| `Payment` | PaymentIntent e estado técnico do provedor |
| `PaymentAttempt` | Tentativas técnicas de pagamento |
| `Refund` | Reembolsos executados no provedor |
| `Invoice` | Metadados de fatura, sem emissor implementado no fluxo levantado |
| `CreditNote` | Registro interno criado no reembolso |
| `TrackingEvent` | Histórico materializado de fulfilment |
| `WebhookEvent` | Idempotência/auditoria do webhook da XPayments |

Não existem modelos para:

- histórico genérico de mudanças de status;
- auditoria de alteração manual de encomenda;
- notificações e tentativas de entrega;
- preferências transacionais de canal/idioma;
- expedição/parcelas separadas;
- eventos brutos de transportadora.

## 9. Superfícies atuais

| Superfície | Acesso | Função |
| --- | --- | --- |
| `/checkout/success?order=...&token=...` | Número + token | Mostra e reconcilia pagamento; exibe rastreio |
| `/account/orders` | Número + token salvo no navegador | Histórico privado da encomenda |
| `/track?code=...` | Código de rastreio | Linha do tempo pública com dados mínimos |
| `/admin/orders` | Sessão admin | Pesquisa compras confirmadas/reembolsadas |
| `/admin/orders/{orderNumber}` | Sessão admin | Detalhes, estado, rastreio e reembolso |

Tentativas pendentes não aparecem como encomendas normais no admin; ficam nas superfícies de diagnóstico de pagamentos.

## 10. Configurações necessárias

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Banco PostgreSQL em runtime |
| `DIRECT_URL` | Conexão de manutenção/migração referenciada pelo Prisma |
| `XPAYMENTS_API_KEY` | API de pagamentos |
| `XPAYMENTS_STORE_ID` | Loja na XPayments |
| `XPAYMENTS_WEBHOOK_SECRET` | Validação opcional do webhook |
| `NEXT_PUBLIC_XPAYMENTS_STRIPE_PUBLISHABLE_KEY` | SDK do pagamento no navegador |
| `RESEND_API_KEY` | E-mail transacional |
| `CRON_SECRET` | Proteção do endpoint interno de reconciliação |

## 11. Lacunas prioritárias para o redesenho

1. Definir uma máquina de estados explícita e transições permitidas.
2. Separar evento de domínio, persistência do estado e envio de comunicação.
3. Criar uma outbox/fila de notificações com idempotência, tentativas e auditoria.
4. Criar templates por evento e idioma.
5. Corrigir o link de rastreio do e-mail.
6. Decidir se o fulfilment será manual, por 3PL/transportadora ou temporariamente simulado.
7. Fazer alterações do admin gerarem histórico e eventos de domínio.
8. Implementar comunicações de expedição, entrega, falha, cancelamento e reembolso.
9. Resolver emissão/entrega de faturas e notas de crédito.
10. Versionar e monitorar os agendamentos necessários.
11. Adicionar painel de entregas de e-mail, falhas e reenvio.
12. Alinhar textos legais e comerciais ao comportamento efetivamente disponível.

## 12. Arquivos centrais

- `src/app/api/checkout/create/route.ts`
- `src/app/api/payments/create-intent/route.ts`
- `src/app/api/payments/status/route.ts`
- `src/app/api/webhooks/xpayments/route.ts`
- `src/app/api/internal/payments/reconcile/route.ts`
- `src/lib/payments/reconcile-payment.ts`
- `src/lib/payments/refunds.ts`
- `src/lib/tracking.ts`
- `src/lib/email/order-email.ts`
- `src/lib/payment-events.ts`
- `src/app/api/orders/route.ts`
- `src/app/api/tracking/route.ts`
- `src/app/admin/actions.ts`
- `src/app/admin/(panel)/orders/[orderNumber]/page.tsx`
- `prisma/schema.prisma`
