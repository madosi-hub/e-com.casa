BEGIN READ ONLY;
SET LOCAL statement_timeout = '25s';
WITH events AS (
 SELECT e.event_id,e.session_id,e.created_at,e.event_name,
 max(d.string_value) FILTER (WHERE d.data_key='stage') AS stage,
 max(d.string_value) FILTER (WHERE d.data_key='status') AS status,
 max(d.string_value) FILTER (WHERE d.data_key='reason') AS reason,
 max(d.number_value) FILTER (WHERE d.data_key='duration_ms') AS duration_ms
 FROM website_event e JOIN session s ON s.session_id=e.session_id
 LEFT JOIN event_data d ON d.website_event_id=e.event_id AND d.website_id=e.website_id
 WHERE e.website_id='b400c97b-5e22-4645-b937-11f5428f2705'::uuid
 AND e.hostname='e-com.casa' AND s.country='PT'
 AND e.created_at>='2026-09-26 23:00:00+00'::timestamptz
 AND e.created_at<'2026-09-27 20:07:31+00'::timestamptz
 AND e.url_path ~ '^/offers/(nuralta-painel-ripado|painel-ripado)/checkout/?$'
 AND e.event_name IN ('checkout_payment_loading','checkout_payment_error','checkout_blocked','checkout_payment_attempt')
 GROUP BY e.event_id,e.session_id,e.created_at,e.event_name
), version_first AS (
 SELECT min(created_at) AS first_session_stage FROM events
 WHERE event_name='checkout_payment_loading' AND stage='session'
), periods AS (
 SELECT e.*, CASE WHEN created_at<'2026-09-27 14:16:00+00'::timestamptz THEN 'before_1416'
 WHEN created_at<(SELECT first_session_stage FROM version_first) THEN '1416_to_first_session_stage'
 ELSE 'after_first_session_stage' END AS period
 FROM events e
), period_events AS (
 SELECT period,event_name,count(*) AS events,count(DISTINCT session_id) AS sessions
 FROM periods GROUP BY period,event_name
), stage_summary AS (
 SELECT period,stage,status,count(*) AS events,count(DISTINCT session_id) AS sessions,
 count(duration_ms) AS duration_n,min(duration_ms) AS min_ms,
 percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) AS median_ms,
 percentile_cont(0.9) WITHIN GROUP (ORDER BY duration_ms) AS p90_ms,max(duration_ms) AS max_ms
 FROM periods WHERE event_name='checkout_payment_loading'
 AND stage IN ('order','intent','session','stripe','element') AND status IN ('started','ready','error')
 GROUP BY period,stage,status
), safe_errors AS (
 SELECT period,event_name,
 CASE WHEN stage ~ '^[a-z][a-z0-9_]{0,50}$' THEN stage ELSE 'other_or_missing' END AS stage,
 CASE WHEN reason IS NULL THEN NULL WHEN reason ~ '^[a-z][a-z0-9_]{0,80}$' THEN reason ELSE 'other_redacted' END AS reason,
 count(*) AS events,count(DISTINCT session_id) AS sessions
 FROM periods WHERE event_name IN ('checkout_payment_error','checkout_blocked') OR status='error'
 GROUP BY 1,2,3,4
), seeds AS (
 SELECT event_id,session_id,created_at,period,
 CASE WHEN stage='session' THEN 'new_session_stage' ELSE 'legacy_order_stage' END AS version
 FROM periods WHERE event_name='checkout_payment_loading' AND status='started'
 AND (stage='session' OR (stage='order' AND created_at<(SELECT first_session_stage FROM version_first)))
), starts AS (
 SELECT *,lead(created_at) OVER (PARTITION BY session_id ORDER BY created_at,event_id) AS next_start
 FROM seeds
), paired AS (
 SELECT s.session_id,s.created_at,s.period,s.version,s.next_start,
 count(*) FILTER (WHERE r.stage='order') AS order_ready_n,
 count(*) FILTER (WHERE r.stage='intent') AS intent_ready_n,
 count(*) FILTER (WHERE r.stage='session') AS session_ready_n,
 count(*) FILTER (WHERE r.stage='stripe') AS stripe_ready_n,
 count(*) FILTER (WHERE r.stage='element') AS element_ready_n,
 max(r.duration_ms) FILTER (WHERE r.stage='order') AS order_ms,
 max(r.duration_ms) FILTER (WHERE r.stage='intent') AS intent_ms,
 max(r.duration_ms) FILTER (WHERE r.stage='session') AS session_ms,
 max(r.duration_ms) FILTER (WHERE r.stage='stripe') AS stripe_ms,
 max(r.duration_ms) FILTER (WHERE r.stage='element') AS element_ms,
 extract(epoch FROM (max(r.created_at) FILTER (WHERE r.stage='element')-s.created_at))*1000 AS observed_wall_ms
 FROM starts s LEFT JOIN LATERAL (
  SELECT DISTINCT ON (e.stage) e.stage,e.duration_ms,e.created_at
  FROM events e WHERE e.session_id=s.session_id
  AND e.created_at>=s.created_at AND (s.next_start IS NULL OR e.created_at<s.next_start)
  AND e.event_name='checkout_payment_loading' AND e.status='ready'
  AND e.stage IN ('order','intent','session','stripe','element')
  ORDER BY e.stage,e.created_at,e.event_id
 ) r ON true
 GROUP BY s.session_id,s.created_at,s.period,s.version,s.next_start
), cycles AS (
 SELECT *, CASE WHEN version='new_session_stage' THEN session_ms+stripe_ms+element_ms
 ELSE order_ms+intent_ms+stripe_ms+element_ms END AS actual_wait_ms
 FROM paired
), cycle_summary AS (
 SELECT period,version,count(*) AS observed_starts,count(DISTINCT session_id) AS sessions,
 count(actual_wait_ms) AS fully_paired_cycles,
 count(*) FILTER (WHERE element_ready_n>0) AS cycles_with_element_ready,
 count(*) FILTER (WHERE actual_wait_ms IS NULL AND next_start IS NOT NULL) AS incomplete_before_another_start,
 count(*) FILTER (WHERE actual_wait_ms IS NULL AND next_start IS NULL) AS incomplete_final_cycles,
 min(actual_wait_ms) AS min_wait_ms,percentile_cont(0.5) WITHIN GROUP (ORDER BY actual_wait_ms) AS median_wait_ms,
 percentile_cont(0.9) WITHIN GROUP (ORDER BY actual_wait_ms) AS p90_wait_ms,max(actual_wait_ms) AS max_wait_ms
 FROM cycles GROUP BY period,version
), first_complete AS (
 SELECT DISTINCT ON (session_id,version) session_id,version,period,actual_wait_ms
 FROM cycles WHERE actual_wait_ms IS NOT NULL ORDER BY session_id,version,created_at
), first_complete_summary AS (
 SELECT period,version,count(*) AS sessions,min(actual_wait_ms) AS min_wait_ms,
 percentile_cont(0.5) WITHIN GROUP (ORDER BY actual_wait_ms) AS median_wait_ms,
 percentile_cont(0.9) WITHIN GROUP (ORDER BY actual_wait_ms) AS p90_wait_ms,max(actual_wait_ms) AS max_wait_ms
 FROM first_complete GROUP BY period,version
), anonymous_cycles AS (
 SELECT left(session_id::text,8) AS session,created_at AS cycle_start_utc,version,next_start,
 order_ready_n,intent_ready_n,session_ready_n,stripe_ready_n,element_ready_n,
 session_ms,stripe_ms,element_ms,actual_wait_ms,observed_wall_ms
 FROM cycles
), session_ready_flags AS (
 SELECT session_id,bool_or(stage='session') AS new_stage_seen,
 bool_or(stage='element' AND status='ready') AS element_ready,
 bool_or(status='error') AS loading_error
 FROM events WHERE event_name='checkout_payment_loading' GROUP BY session_id
), readiness AS (
 SELECT new_stage_seen,count(*) AS loading_sessions,
 count(*) FILTER (WHERE element_ready) AS element_ready_sessions,
 count(*) FILTER (WHERE loading_error) AS loading_error_sessions
 FROM session_ready_flags GROUP BY new_stage_seen
)
SELECT json_build_object(
 'cutoff_utc','2026-09-27T20:07:31Z',
 'first_new_session_stage_utc',(SELECT first_session_stage FROM version_first),
 'period_events',(SELECT json_agg(period_events ORDER BY period,event_name) FROM period_events),
 'stage_summary',(SELECT json_agg(stage_summary ORDER BY period,stage,status) FROM stage_summary),
 'safe_errors',(SELECT json_agg(safe_errors ORDER BY period,event_name,stage) FROM safe_errors),
 'readiness',(SELECT json_agg(readiness ORDER BY new_stage_seen) FROM readiness),
 'cycle_summary',(SELECT json_agg(cycle_summary ORDER BY period,version) FROM cycle_summary),
 'first_complete_per_session',(SELECT json_agg(first_complete_summary ORDER BY period,version) FROM first_complete_summary),
 'anonymous_cycles',(SELECT json_agg(anonymous_cycles ORDER BY cycle_start_utc,session) FROM anonymous_cycles)
);
ROLLBACK;
