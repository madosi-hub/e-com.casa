# Checkout após publicação — 27/09/2026

Janela fixa: 11:51–14:16 UTC (12:51–15:16 Europe/Lisbon).
Fonte: consultas SQL somente leitura no Umami de produção. Não foram criados pedidos nem pagamentos.

## Publicação

Confirmada por GET público às 14:17:30 UTC. O JavaScript servido inclui `checkout_payment_loading`, `Rever dados de entrega`, `STRIPE_LOAD_TIMEOUT` e a leitura correta de `availablePaymentMethods`.
Chunk: `https://e-com.casa/_next/static/immutable/chunks/41qrej3a94lr4.js`.
SHA256: `906acdc1cd6add8080c191ffa551bb4bef6aaa61f9a4812f7f500189ab880bbe`.
Isto prova a versão servida nesse momento, não a versão recebida por cada visita anterior.

## Portugal, na janela

| Medida | Sessões distintas |
| --- | ---: |
| Atividade nas páginas da oferta | 59 |
| Adição ao carrinho | 6 |
| Entrada no checkout | 4 |
| Tentativa de confirmar pagamento | 2 |
| Erro de pagamento registado | 0 |
| Bloqueio de checkout registado | 0 |
| Nova medição de carregamento | 2 |

58 das 59 sessões na oferta tinham pelo menos um sinal de origem Meta (UTM FB, referrer ou fbclid).
As contagens usam os caminhos `/offers/nuralta-painel-ripado` e `/offers/painel-ripado` e o checkout correspondente; não contam os cliques sintéticos de Iniciar checkout como pessoas.
Contagens por etapa dentro da janela não constituem uma análise causal por coorte: podem incluir sessões iniciadas antes do limite.

## Aprovações registadas

Foi encontrado um novo pagamento de EUR 10 às 12:24:53 UTC (13:24:53 Portugal), com país PT, origem FB, painel no pedido e envio UTMify `sent` / HTTP 200.
Total desde a meia-noite de Portugal até ao corte: 2 aprovações (EUR 31 + EUR 10).
O evento pago não tem uma ligação explícita ao ID de sessão; não se atribui causalmente a venda às mudanças. Uma sessão que tentou EUR 10 chegou à página de sucesso às 12:24:50 UTC, mas não registou a nova telemetria de carregamento.

## Duas sessões com telemetria nova

| Etapa | Sessão A | Sessão B |
| --- | ---: | ---: |
| Preparar pedido | 0,773 s | 0,921 s |
| Endpoint de criação/reutilização do pagamento | 5,929 s | 6,871 s |
| Inicializar Stripe.js após endpoint | 0,053 s | 0,025 s |
| Campos de pagamento | 1,292 s | 1,546 s |
| Soma das etapas | 8,047 s | 9,363 s |

Ambas chegaram a `element:ready`, sem erro de carregamento registado; não registaram clique em Pagar nem tentativa de confirmação e depois registaram navegação de volta à oferta.
A duração do endpoint inclui rede, servidor, banco e integração XPayments. Não prova que todo esse tempo foi gasto no gateway.
Dois visitantes são insuficientes para estimar o efeito das mudanças na conversão.

## Limitações e próximo diagnóstico

Os replays recentes não foram consultados: a revisão automática rejeitou essa ação por considerar insuficiente a autorização específica para replays privados. Não há conclusão sobre quais campos foram preenchidos.
Eventos não registados não excluem todos os erros possíveis. Não foi feita auditoria do estado de cada transação diretamente na XPayments.
Prioridade técnica: medir no servidor quanto dos 6–7 segundos do endpoint pertence ao banco e quanto à XPayments, antes de escolher a otimização. Reavaliar a conversão com mais entradas na nova versão e períodos/tráfego comparáveis.
