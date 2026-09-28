# Oferta Nuralta — auditoria de 27/09/2026

Período: 00:00–21:07:31 em Portugal continental (Europe/Lisbon), equivalente a 26/09 23:00–27/09 20:07:31 UTC. Consultas somente leitura no Umami de produção e GET dos ficheiros públicos. Nenhum pedido, pagamento, reconciliação ou alteração de produção foi executado.

## Resultado de hoje

| Etapa | Quantidade |
| --- | ---: |
| Sessões de Portugal na oferta | 319 |
| Sessões com adição ao carrinho | 39 |
| Sessões com entrada no checkout | 34 |
| Sessões com tentativa de confirmar pagamento | 13 |
| Pedidos distintos com aprovação registada | 4 |
| Receita aprovada registada | €66 |

As etapas contam sessões distintas com atividade nos caminhos da oferta `nuralta-painel-ripado` ou no seu alias `painel-ripado`. As compras são pedidos pagos no período, não uma coorte ligada individualmente às sessões. Uma sessão entrou no checkout no período sem atividade na página da oferta nesse mesmo período; por isso, restringir o checkout às 319 sessões da oferta produz 33, enquanto o total de entradas é 34. Cliques sintéticos “Iniciar checkout” não são usados como pessoas nem como compras.

Das 319 sessões na oferta, 307 apresentavam sinais de origem Meta e 314 eram mobile. Os quatro pagamentos tinham país PT, origem FB e painel nos artigos. Todos foram entregues ao Umami e à UTMify; UTMify respondeu HTTP 200.

| Hora em Portugal | Valor |
| --- | ---: |
| 10:59 | €31 |
| 13:24 | €10 |
| 15:36 | €20 |
| 18:44 | €5 |

Desde o corte anterior, às 15:16 de Portugal, foram registadas duas aprovações adicionais, totalizando €25. Isto não atribui causalmente vendas à alteração publicada.

## Carregamento após a alteração

Os assets públicos observados às 20:09 UTC incluem a preparação antecipada de `5d4b809`: cache partilhado, debounce de 650 ms no carrinho e `prepareEarly` no checkout. Isto confirma o frontend servido nesse momento, não toda a versão do backend.

A primeira sessão portuguesa com a nova medição foi registada às 16:34 de Portugal.

| Medição | Sessões | Mediana do primeiro carregamento completo |
| --- | ---: | ---: |
| Antes da preparação antecipada | 4 | 8,705 s |
| Com preparação antecipada | 11 | 2,333 s |

Redução observada: aproximadamente 73%. A comparação é observacional, com amostra pequena, e não demonstra aumento de conversão. O tempo novo soma espera da sessão, inicialização Stripe e formulário pronto. Os tempos de pedido e intent reproduzidos do carrinho são excluídos para evitar contagem dupla. Não é uma medida completa de navegação, hidratação ou carregamento da página.

As 11 sessões novas chegaram a formulário pronto, sem erro explícito de carregamento. O primeiro carregamento variou de 1,538 a 9,555 s; houve uma recarga de 13,559 s. A melhoria não eliminou todos os casos lentos. Foram observados 19 ciclos novos: 16 completos, dois interrompidos antes de outro início e um último incompleto; estes três pertencem a sessões que já tinham carregado anteriormente.

## Abandono e limites do diagnóstico

- 21 das 34 sessões no checkout não registaram tentativa de confirmar pagamento.
- Houve nove bloqueios de validação dos dados de pagamento em seis sessões. Quatro dessas sessões avançaram depois para uma tentativa; duas não registaram tentativa.
- Não foi registado `checkout_payment_error` hoje no escopo português da oferta. Ausência desse evento não prova ausência de recusas bancárias, falhas de tracking ou problemas fora do fluxo instrumentado.
- O acesso disponível ao dashboard contém apenas eventos `payment_paid`. Os campos `pending` e `failed` dessa integração representam entrega de eventos à analytics, não estados financeiros. O export da loja também filtra pagamentos aprovados.
- Não foi possível determinar quantas tentativas ficaram pendentes, em processamento ou recusadas. A diferença entre 13 sessões com tentativa e quatro pedidos pagos não pode ser classificada como nove recusas ou abandonos.
- Nenhum replay privado foi consultado. Não há evidência sobre quais campos os visitantes abandonaram ou sobre a motivação da desistência.
- Não há gasto de anúncios atualizado para calcular rentabilidade.

A velocidade melhorou no conjunto medido. A próxima investigação de pagamento depende de estados por transação na loja/gateway; a principal desistência observável no navegador continua anterior à tentativa de confirmação.

## Evidência

- `umami-funnel-2026-09-27-2007Z.jsonl`: agregados do funil e aprovações. Comparações históricas filtradas dependem da presença de país e artigos nos registos antigos e não são usadas como conclusão neste relatório.
- `umami-loading-2026-09-27-2007Z.json` e `.sql`: tempos por etapa e ciclos com IDs de sessão abreviados, sem dados de contacto.
- Asset partilhado: `https://e-com.casa/_next/static/immutable/chunks/1-54x87n_33ud.js`, SHA256 `e7157d96a2fb7e5d9d4d01df0518ad7d35c3890f66c97ae857a011c63a6d416c`.
- Asset do checkout: `https://e-com.casa/_next/static/immutable/chunks/42zp0h0lub_yl.js`, SHA256 `0f805a07a1940a41761d1455bdfe15a2287b046fbe3587c4b7fba88ec016434d`.
