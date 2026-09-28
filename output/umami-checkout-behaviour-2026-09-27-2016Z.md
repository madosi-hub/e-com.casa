# Checkout PT: comportamento observado em eventos

Janela: 2026-09-26 23:00:00 UTC a 2026-09-27 20:16:47 UTC, limite final exclusivo. Site e-com.casa; checkout das duas rotas da oferta painel-ripado. Consultas em transação READ ONLY, timeout 25 s e ROLLBACK. Não foram consultados replays, contactos, tokens, query strings ou registos de pagamentos.

## O que os eventos mostram

- 34 sessões no checkout; 13 com evento de tentativa e 21 sem tentativa.
- Das 13 que tentaram, três registaram visita posterior à página de resultado `/sucesso`. Essa visita não comprova pagamento aprovado.
- Das dez sem visita ao resultado, seis regressaram à oferta depois de uma tentativa. Uma dessas seis voltou ao checkout e tentou uma segunda vez. As outras quatro terminaram os eventos registados exatamente na tentativa, sem erro ou navegação posterior observável.
- Nenhuma dessas 13 sessões registou `checkout_payment_error`.
- Todas as sessões do grupo são classificadas como mobile pelo Umami.

| Ambiente observado | Sessões com tentativa | Com visita posterior ao resultado |
|---|---:|---:|
| Chrome / Android | 6 | 0 |
| Chromium WebView / Android | 1 | 0 |
| Facebook / iOS | 5 | 2 |
| Instagram / iOS | 1 | 1 |

A distribuição merece investigação, mas a amostra não permite atribuir a causa ao Android, ao navegador interno ou a 3DS.

## As 21 sessões sem tentativa

- 16 não têm cliques em botões/links do checkout registados. Isso não significa ausência de preenchimento: o rastreador de cliques não observa digitação nem interações dentro do iframe do Stripe.
- Nove têm confirmação de que o Payment Element ficou pronto.
- Duas clicaram em Pagar e foram bloqueadas por `stage=payment_details`, `reason=validation_error`, sem tentativa posterior: `7f546cee` uma vez e `5e11b3fe` três vezes.
- Uma sessão (`2866a439`) clicou três vezes em tentar novamente/recarregar. Tinha carregamentos concluídos antes e entre esses cliques, mas nenhum erro explícito registado; o motivo de repetir não está nos eventos.
- Nenhuma tem clique registado em Rever dados de entrega.
- Quinze voltaram à oferta em algum momento depois de visitar o checkout.
- O intervalo entre primeiro e último evento de checkout foi de pelo menos 30 s em oito sessões e pelo menos 60 s em sete. Estes intervalos incluem possíveis saídas, retornos e períodos sem atividade; não são tempo de atenção contínua. Três das oito não têm cliques registados.

## Exemplos de sequências, em UTC

- `7f546cee`: 07:57:22 checkout → 07:58:26 Pagar 13,00 → validação recusou os dados de pagamento → 07:58:40 oferta. Nenhuma tentativa de confirmação.
- `5e11b3fe`: 15:58:16 pagamento pronto → cliques Pagar 5,00 às 16:54:35, 16:55:11 e 16:58:26 → três erros de validação. Nenhuma tentativa de confirmação. O intervalo longo não prova que permaneceu ativo na página.
- `7c97c35d`: 09:43:52 tentativa → 09:44:04 oferta → 09:45:02 checkout → 09:45:47 segunda tentativa → fim dos eventos. Nenhuma visita ao resultado ou erro explícito.
- `1734c73d`: 18:22:46 pagamento pronto → 18:24:41 Pagar 35,00 → 18:24:42 tentativa → fim dos eventos. Não é possível distinguir autorização externa, fecho da página, espera pendente ou perda de tracking.
- `acf22639`: 17:41:33 pagamento pronto → 17:43:30 bloqueio de validação → 17:43:39 nova tentativa → 17:44:07 página de resultado. Não há associação desta sessão a um pagamento confirmado nesta análise.

## Limitações e próxima medição

O evento de tentativa é emitido antes de `confirmPayment`. A ausência de evento posterior não demonstra recusa, sucesso, espera infinita ou autenticação 3DS/MB WAY. A integração atual não regista um resultado normalizado depois do retorno do SDK. Esse resultado, juntamente com estados agregados do gateway, permitiria distinguir os cenários. O hook também devolve `ok: true` quando o SDK retorna sem erro mas com estado diferente de `succeeded`/`processing`, sem registar qual foi o estado; é uma hipótese de implementação a verificar, não uma causa comprovada destas sessões.

Foram excluídos os cliques sintéticos “Iniciar checkout”. Não há nos eventos analisados um marcador fiável para separar visitantes reais, testes do proprietário e automação. Horários de ingestão podem inverter eventos emitidos quase simultaneamente: um dos cliques e o respetivo bloqueio diferem por apenas 17 ms em ordem invertida.

Dados completos seguros: `umami-checkout-behaviour-2026-09-27-2016Z.json`. Consulta reproduzível: `umami-checkout-behaviour-2026-09-27-2016Z.sql`.
