BEGIN READ ONLY;
SET LOCAL statement_timeout = '25s';
WITH checkout_cohort AS (
 SELECT e.session_id,min(e.created_at) AS first_checkout_at
 FROM website_event e JOIN session s ON s.session_id=e.session_id
 WHERE e.website_id='b400c97b-5e22-4645-b937-11f5428f2705'::uuid
 AND e.hostname='e-com.casa' AND s.country='PT'
 AND e.created_at>='2026-09-26 23:00:00+00'::timestamptz
 AND e.created_at<'2026-09-27 20:16:47+00'::timestamptz
 AND e.url_path ~ '^/offers/(nuralta-painel-ripado|painel-ripado)/checkout/?$'
 AND e.event_name IS DISTINCT FROM 'ui_click · Iniciar checkout'
 GROUP BY e.session_id
), event_rows AS (
 SELECT e.event_id,e.session_id,e.created_at,e.event_name,e.event_type,c.first_checkout_at,
 CASE WHEN e.url_path ~ '^/offers/(nuralta-painel-ripado|painel-ripado)/checkout/?$' THEN 'checkout'
 WHEN e.url_path ~ '^/offers/(nuralta-painel-ripado|painel-ripado)/checkout/(sucesso|success)/?$' OR e.url_path='/checkout/success' THEN 'success_page'
 WHEN e.url_path ~ '^/offers/(nuralta-painel-ripado|painel-ripado)/?$' THEN 'offer'
 WHEN e.url_path ~ '^/cart/?$' THEN 'cart_page' ELSE 'other_page' END AS page,
 max(d.string_value) FILTER (WHERE d.data_key='stage') AS stage,
 max(d.string_value) FILTER (WHERE d.data_key='reason') AS reason,
 max(d.string_value) FILTER (WHERE d.data_key='status') AS status,
 max(d.number_value) FILTER (WHERE d.data_key='value') AS value,
 max(d.number_value) FILTER (WHERE d.data_key='quantity') AS quantity,
 max(d.string_value) FILTER (WHERE d.data_key='currency') AS currency
 FROM checkout_cohort c JOIN website_event e ON e.session_id=c.session_id
 LEFT JOIN event_data d ON d.website_event_id=e.event_id AND d.website_id=e.website_id
 AND d.data_key IN ('stage','reason','status','value','currency','quantity')
 WHERE e.website_id='b400c97b-5e22-4645-b937-11f5428f2705'::uuid
 AND e.hostname='e-com.casa' AND e.created_at>=c.first_checkout_at
 AND e.created_at<'2026-09-27 20:16:47+00'::timestamptz
 AND e.event_name IS DISTINCT FROM 'ui_click · Iniciar checkout'
 GROUP BY e.event_id,e.session_id,e.created_at,e.event_name,e.event_type,e.url_path,c.first_checkout_at
), classified AS (
 SELECT *, CASE
 WHEN event_name ~ '^ui_click · Pagar [ €0-9.,]+$' THEN 'click_pay'
 WHEN event_name='ui_click · Rever dados de entrega' THEN 'click_review_delivery'
 WHEN event_name IN ('ui_click · Tentar novamente','ui_click · Recarregar página') THEN 'click_retry_or_reload'
 WHEN event_name='ui_click · Voltar à oferta' THEN 'click_back_offer'
 WHEN event_name ~ '^ui_click · (Abrir carrinho, [0-9]+ artigos|Carrinho|Voltar ao carrinho)$' THEN 'click_cart'
 WHEN event_name LIKE 'ui_click%' THEN 'other_ui_click'
 WHEN event_name IN ('checkout_payment_attempt','checkout_blocked','checkout_payment_error') THEN event_name
 WHEN event_name='checkout_payment_loading' AND stage='element' AND status='ready' THEN 'payment_element_ready'
 WHEN event_name='checkout_payment_loading' AND status='error' THEN 'payment_loading_error'
 WHEN event_type=1 AND page='success_page' THEN 'success_page_view'
 WHEN page='offer' AND (event_type=1 OR event_name='offer_view') THEN 'offer_view_after_checkout'
 WHEN event_type=1 AND page='cart_page' THEN 'cart_page_view'
 WHEN event_type=1 AND page='checkout' THEN 'checkout_page_view'
 ELSE 'other_event' END AS kind
 FROM event_rows
), session_summary AS (
 SELECT e.session_id,min(e.first_checkout_at) AS first_checkout_at,max(e.created_at) AS last_recorded_at,
 max(e.created_at) FILTER (WHERE page='checkout') AS last_checkout_event_at,
 count(*) FILTER (WHERE page='checkout') AS checkout_events,
 count(*) FILTER (WHERE page='checkout' AND event_name LIKE 'ui_click%') AS checkout_ui_clicks,
 count(*) FILTER (WHERE page='checkout' AND kind='click_pay') AS pay_clicks,
 count(*) FILTER (WHERE page='checkout' AND kind='click_review_delivery') AS review_delivery_clicks,
 count(*) FILTER (WHERE page='checkout' AND kind='click_retry_or_reload') AS retry_reload_clicks,
 count(*) FILTER (WHERE page='checkout' AND kind IN ('click_cart','click_back_offer')) AS back_cart_or_offer_clicks,
 count(*) FILTER (WHERE page='checkout' AND kind='checkout_blocked') AS blocked,
 count(*) FILTER (WHERE page='checkout' AND kind='checkout_payment_attempt') AS attempts,
 count(*) FILTER (WHERE page='checkout' AND kind='checkout_payment_error') AS payment_errors,
 count(*) FILTER (WHERE page='checkout' AND kind='payment_loading_error') AS loading_errors,
 bool_or(page='checkout' AND kind='payment_element_ready') AS element_ready,
 min(created_at) FILTER (WHERE page='checkout' AND kind='checkout_payment_attempt') AS first_attempt_at,
 max(created_at) FILTER (WHERE page='checkout' AND kind='checkout_payment_attempt') AS last_attempt_at,
 min(created_at) FILTER (WHERE kind='success_page_view') AS first_success_page_at,
 min(created_at) FILTER (WHERE kind='offer_view_after_checkout') AS first_offer_return_at,
 min(created_at) FILTER (WHERE kind='cart_page_view') AS first_cart_page_at
 FROM classified e GROUP BY e.session_id
), summaries AS (
 SELECT a.*,s.browser,s.os,s.device,
 extract(epoch FROM (a.last_checkout_event_at-a.first_checkout_at)) AS observed_checkout_span_s,
 extract(epoch FROM (a.last_recorded_at-a.last_attempt_at)) AS recorded_span_after_last_attempt_s,
 EXISTS(SELECT 1 FROM classified e WHERE e.session_id=a.session_id AND e.kind='success_page_view' AND e.created_at>=a.first_attempt_at) AS success_page_after_attempt,
 EXISTS(SELECT 1 FROM classified e WHERE e.session_id=a.session_id AND e.kind='offer_view_after_checkout' AND e.created_at>=a.first_attempt_at) AS offer_return_after_attempt,
 (SELECT page FROM classified e WHERE e.session_id=a.session_id ORDER BY e.created_at DESC,e.event_id DESC LIMIT 1) AS last_page_kind
 FROM session_summary a JOIN session s ON s.session_id=a.session_id
), cohort_summary AS (
 SELECT count(*) AS checkout_sessions,
 count(*) FILTER (WHERE attempts>0) AS attempted_sessions,
 count(*) FILTER (WHERE attempts=0) AS no_attempt_sessions,
 count(*) FILTER (WHERE attempts>0 AND success_page_after_attempt) AS attempts_with_later_success_page,
 count(*) FILTER (WHERE attempts>0 AND offer_return_after_attempt) AS attempts_with_later_offer_return,
 count(*) FILTER (WHERE attempts>0 AND NOT success_page_after_attempt) AS attempts_without_success_page,
 count(*) FILTER (WHERE attempts=0 AND checkout_ui_clicks=0) AS no_attempt_without_recorded_ui_clicks,
 count(*) FILTER (WHERE attempts=0 AND observed_checkout_span_s>=30) AS no_attempt_span_at_least_30s,
 count(*) FILTER (WHERE attempts=0 AND observed_checkout_span_s>=60) AS no_attempt_span_at_least_60s,
 count(*) FILTER (WHERE attempts=0 AND checkout_ui_clicks=0 AND observed_checkout_span_s>=30) AS no_click_span_at_least_30s,
 count(*) FILTER (WHERE attempts=0 AND pay_clicks>0) AS no_attempt_with_pay_click,
 count(*) FILTER (WHERE attempts=0 AND blocked>0) AS no_attempt_with_blocked,
 count(*) FILTER (WHERE attempts=0 AND review_delivery_clicks>0) AS no_attempt_with_review_delivery,
 count(*) FILTER (WHERE attempts=0 AND retry_reload_clicks>0) AS no_attempt_with_retry_reload,
 count(*) FILTER (WHERE attempts=0 AND element_ready) AS no_attempt_with_element_ready,
 count(*) FILTER (WHERE attempts=0 AND first_offer_return_at IS NOT NULL) AS no_attempt_with_offer_return,
 count(*) FILTER (WHERE attempts=0 AND back_cart_or_offer_clicks>0) AS no_attempt_with_back_cart_offer_click
 FROM summaries
), safe_sessions AS (
 SELECT left(session_id::text,8) AS session,browser,os,device,first_checkout_at,last_recorded_at,last_checkout_event_at,
 checkout_events,checkout_ui_clicks,pay_clicks,review_delivery_clicks,retry_reload_clicks,back_cart_or_offer_clicks,
 blocked,attempts,payment_errors,loading_errors,element_ready,first_attempt_at,last_attempt_at,
 first_success_page_at,first_offer_return_at,first_cart_page_at,observed_checkout_span_s,
 recorded_span_after_last_attempt_s,success_page_after_attempt,offer_return_after_attempt,last_page_kind
 FROM summaries
), safe_timeline AS (
 SELECT left(e.session_id::text,8) AS session,e.created_at,e.page,e.kind,
 CASE WHEN e.stage ~ '^[A-Za-z][A-Za-z0-9_]{0,50}$' THEN e.stage ELSE NULL END AS stage,
 CASE WHEN e.reason ~ '^[A-Za-z][A-Za-z0-9_]{0,80}$' THEN e.reason ELSE NULL END AS reason,
 CASE WHEN e.kind='click_pay' THEN regexp_replace(e.event_name,'[^0-9.,]','','g') ELSE NULL END AS pay_label_amount,
 e.value,e.quantity,CASE WHEN e.currency ~ '^[A-Z]{3}$' THEN e.currency ELSE NULL END AS currency
 FROM classified e JOIN summaries s ON s.session_id=e.session_id
 WHERE (s.attempts>0 OR s.blocked>0 OR s.pay_clicks>0 OR s.retry_reload_clicks>0)
 AND e.kind IN ('click_pay','click_review_delivery','click_retry_or_reload','click_back_offer','click_cart',
 'checkout_payment_attempt','checkout_blocked','checkout_payment_error','payment_element_ready','payment_loading_error',
 'success_page_view','offer_view_after_checkout','cart_page_view','checkout_page_view')
), browser_summary AS (
 SELECT browser,os,device,count(*) AS checkout_sessions,count(*) FILTER (WHERE attempts>0) AS attempted_sessions,
 count(*) FILTER (WHERE attempts>0 AND success_page_after_attempt) AS attempted_with_later_success_page
 FROM summaries GROUP BY browser,os,device
)
SELECT json_build_object(
 'cutoff_utc','2026-09-27T20:16:47Z',
 'summary',(SELECT row_to_json(cohort_summary) FROM cohort_summary),
 'browsers',(SELECT json_agg(browser_summary ORDER BY checkout_sessions DESC) FROM browser_summary),
 'sessions',(SELECT json_agg(safe_sessions ORDER BY first_checkout_at) FROM safe_sessions),
 'timelines',(SELECT json_agg(safe_timeline ORDER BY session,created_at) FROM safe_timeline)
);
ROLLBACK;
