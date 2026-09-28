"""Read-only replay audit. Never emit field values, DOM text, URLs or full IDs.

Run on the Umami host with Python 3 via stdin. Optional arguments are eight-
character session prefixes. All SQL runs in a read-only transaction and rolls
back. Replay DOM visibility is approximate; this does not execute CSS or JS.
"""
import collections
from datetime import datetime, timedelta
import gzip
import json
import re
import subprocess
import sys
from urllib.parse import urlsplit

SITE = 'b400c97b-5e22-4645-b937-11f5428f2705'
START = '2026-09-26 23:00:00+00:00'
CUTOFF = '2026-09-27 11:51:00+00:00'
START_MS = int(datetime.fromisoformat(START).timestamp() * 1000)
END_MS = int(datetime.fromisoformat(CUTOFF).timestamp() * 1000)
PRIMER_START = (datetime.fromisoformat(START) - timedelta(days=1)).isoformat()
OFFER_PATHS = {'/offers/nuralta-painel-ripado', '/offers/painel-ripado'}
CHECKOUT_PATHS = {path + '/checkout' for path in OFFER_PATHS}
REQUIRED_FIELDS = {'co-firstName', 'co-email', 'co-address', 'co-city', 'co-postalCode'}
ALLOWED_FIELDS = REQUIRED_FIELDS | {'co-address2'}
PSQL = ['docker', 'exec', 'umami-mith-db', 'psql', '-XqAt', '-v',
        'ON_ERROR_STOP=1', '-F', '\t', '-U', 'umami_mith', '-d', 'umami_mith']


def readonly_sql(sql):
    return ("BEGIN READ ONLY; SET LOCAL statement_timeout='30s'; "
            "SET LOCAL lock_timeout='3s'; " + sql + '; ROLLBACK;')


def query(sql):
    completed = subprocess.run(PSQL + ['-c', readonly_sql(sql)],
                               capture_output=True, text=True, encoding='utf-8')
    if completed.returncode:
        # Do not forward database diagnostics, query data or replay payloads.
        raise RuntimeError('read_only_query_failed')
    return completed.stdout


ERROR_PATTERNS = {
    'prepare_error': re.compile(
        r'^(?:We could not start the payment\. Please try again\.|'
        r'Não foi possível preparar o checkout\.?)(?:\s+Referência:.*)?$', re.I),
    'temporarily_unavailable': re.compile(
        r'^(?:Online payments are temporarily unavailable\. Please try again shortly\.|'
        r'Os pagamentos online estão temporariamente indisponíveis\. Tente novamente daqui a pouco\.)$', re.I),
    'payment_failed': re.compile(
        r'^(?:Não foi possível processar o seu pagamento\. Verifique os seus dados e tente novamente\.|'
        r'O pagamento não foi concluído\.?|Payment failed\.?)$', re.I),
    'sync_error': re.compile(
        r'^(?:Não foi possível guardar os dados de entrega\.|'
        r'O checkout foi atualizado\. Atualize o pagamento antes de continuar\.|'
        r'Aguarde a atualização do pagamento\.|'
        r'Não foi possível atualizar a encomenda\.)$', re.I),
    'payment_details_error': re.compile(r'^Verifique os dados de pagamento$', re.I),
    'required_field_error': re.compile(r'^Preencha este campo para continuar\.$', re.I),
    'invalid_email_error': re.compile(r'^Introduza um endereço de e-mail válido\.$', re.I),
    'invalid_checkout_data': re.compile(r'^Invalid checkout data$', re.I),
}
HIDDEN_TAGS = {'script', 'style', 'head', 'noscript', 'template', 'title', 'meta', 'link'}
UUID = re.compile(r'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$', re.I)
# Exact current PT/EN translations; values emitted from this static allowlist,
# never copied from customer DOM text.
PAYMENT_MESSAGES = {
    'A preparar o pagamento seguro…': 'initializing',
    'Preparing secure payment…': 'initializing',
    'Pagamentos indisponíveis': 'unavailable',
    'Payments unavailable': 'unavailable',
    'A processar…': 'processing',
    'Processing…': 'processing',
    'Preencha os dados para continuar': 'fill_details',
    'A carregar o pagamento seguro…': 'secure_loading',
    'Loading secure payment…': 'secure_loading',
    'Tentar novamente': 'retry',
    'Try again': 'retry',
    'Os pagamentos online estão temporariamente indisponíveis. Tente novamente daqui a pouco.': 'unavailable_error',
    'Online payments are temporarily unavailable. Please try again shortly.': 'unavailable_error',
}


class ReplayDOM:
    def __init__(self):
        self.nodes = {}
        self.children = collections.defaultdict(set)
        self.changed = set()
        self.hostname = None
        self.path = None

    def reset_nodes(self):
        self.nodes.clear()
        self.children.clear()
        self.changed.clear()

    def add(self, node, parent=None):
        if not isinstance(node, dict) or node.get('id') is None:
            return
        node_id = node['id']
        previous = self.nodes.get(node_id)
        if previous:
            self.children[previous.get('parent')].discard(node_id)
        self.nodes[node_id] = {key: value for key, value in node.items() if key != 'childNodes'}
        self.nodes[node_id]['parent'] = parent
        self.children[parent].add(node_id)
        self.changed.add(node_id)
        for child in node.get('childNodes', []):
            self.add(child, node_id)

    def descendants(self, node_id):
        pending = [node_id]
        visited = set()
        while pending:
            current = pending.pop()
            if current in visited:
                continue
            visited.add(current)
            yield current
            pending.extend(self.children.get(current, ()))

    def remove(self, node_id):
        node = self.nodes.get(node_id, {})
        self.children[node.get('parent')].discard(node_id)
        for current in list(self.descendants(node_id)):
            self.nodes.pop(current, None)
            self.children.pop(current, None)

    def visible(self, node_id):
        visited = set()
        while node_id is not None:
            if node_id in visited or node_id not in self.nodes:
                return False
            visited.add(node_id)
            node = self.nodes[node_id]
            attrs = node.get('attributes', {})
            if str(node.get('tagName', '')).lower() in HIDDEN_TAGS:
                return False
            if 'hidden' in attrs and attrs['hidden'] is not None:
                return False
            if str(attrs.get('aria-hidden', '')).lower() == 'true':
                return False
            if 'hidden' in str(attrs.get('class', '')).split():
                return False
            style = str(attrs.get('style', '')).lower()
            if re.search(r'(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|opacity\s*:\s*0(?:\s|;|$))', style):
                return False
            node_id = node.get('parent')
        return True

    def text(self, node_id):
        # Only used internally to classify known buttons/messages. Never output.
        pieces = []
        for current in self.descendants(node_id):
            node = self.nodes.get(current, {})
            if node.get('type') == 3 and self.visible(current):
                pieces.append(str(node.get('textContent', '')))
        return re.sub(r'\s+', ' ', ' '.join(pieces)).strip()

    def is_checkout(self):
        # Meta href is often stale after SPA navigation: accept an offer landing
        # path only with the dedicated checkout DOM present. Reject other hosts,
        # generic checkouts and success routes. An absent Meta event is unknown.
        if self.hostname != 'e-com.casa' or self.path not in OFFER_PATHS | CHECKOUT_PATHS:
            return False
        return any(node.get('attributes', {}).get('id') == 'co-payment' and self.visible(node_id)
                   for node_id, node in self.nodes.items())

    def field(self, node_id):
        name = self.nodes.get(node_id, {}).get('attributes', {}).get('id')
        return name if name in ALLOWED_FIELDS else None

    def in_payment_section(self, node_id):
        seen = set()
        while node_id in self.nodes and node_id not in seen:
            seen.add(node_id)
            node = self.nodes[node_id]
            attrs = node.get('attributes', {})
            if attrs.get('aria-labelledby') == 'co-payment' or attrs.get('id') == 'co-payment':
                return True
            node_id = node.get('parent')
        return False

    def apply(self, event):
        self.changed.clear()
        kind, data = event.get('type'), event.get('data', {})
        if kind == 4:
            try:
                url = urlsplit(data.get('href', ''))
                self.hostname, self.path = url.hostname, url.path.rstrip('/')
            except (ValueError, TypeError):
                self.hostname = self.path = None
        if kind == 2:
            self.reset_nodes()
            self.add(data.get('node'))
        if kind == 3 and data.get('source') == 0:
            for item in data.get('removes', []):
                self.remove(item.get('id'))
            for item in data.get('adds', []):
                self.add(item.get('node'), item.get('parentId'))
            for item in data.get('texts', []):
                node_id = item.get('id')
                if node_id in self.nodes:
                    self.nodes[node_id]['textContent'] = item.get('value', '')
                    self.changed.add(node_id)
            for item in data.get('attributes', []):
                node_id = item.get('id')
                if node_id not in self.nodes:
                    continue
                attrs = self.nodes[node_id].setdefault('attributes', {})
                for key, value in item.get('attributes', {}).items():
                    if value is None:
                        attrs.pop(key, None)
                    else:
                        attrs[key] = value
                # A parent visibility change may reveal an existing error.
                self.changed.update(self.descendants(node_id))


def button_kind(text):
    if text in PAYMENT_MESSAGES:
        return PAYMENT_MESSAGES[text]
    if re.match(r'^(?:Pagar|Pay)\s', text, re.I):
        return 'pay'
    return 'unknown'


def new_result(session_id):
    return {'session': session_id[:8], 'chunks': 0, 'invalid_chunks': 0,
            'replay_events_in_window': 0, 'checkout_events': 0,
            'required_fields_nonempty_observed': set(), 'field_interactions': set(),
            'latest_fields': {}, 'masked_nonempty_seen': False,
            'explicit_dom_errors': collections.Counter(), 'button_states': set(),
            'last_button': None, 'submit_click_observed': 0,
            'stripe_iframe_observed': False, 'first_ts': None, 'last_ts': None,
            'visit_spans': {}, 'error_keys': set(), 'button_transitions': [],
            'field_count_transitions': [], 'exact_payment_messages': {},
            'first_all_required_nonempty_at_ms': None,
            'latest_all_required_nonempty_since_ms': None,
            'last_button_observed_at_ms': None, 'last_button_key': None,
            'context_diagnostics': collections.Counter(),
            'last_event_timestamp_by_visit': {}, 'iframe_nodes_seen': set(),
            'stripe_frame_marker_observed': False}


def observe_field(result, field, value):
    nonempty = isinstance(value, str) and bool(value.strip())
    result['latest_fields'][field] = nonempty
    if nonempty and field in REQUIRED_FIELDS:
        result['required_fields_nonempty_observed'].add(field)
    if nonempty and re.fullmatch(r'[\s*•●]+', value):
        result['masked_nonempty_seen'] = True


def record_field_count(result, timestamp):
    count = sum(bool(result['latest_fields'].get(field)) for field in REQUIRED_FIELDS)
    previous = result['field_count_transitions'][-1]['count'] if result['field_count_transitions'] else None
    if count != previous and len(result['field_count_transitions']) < 100:
        result['field_count_transitions'].append({'at_ms': timestamp, 'count': count})
    if count == len(REQUIRED_FIELDS):
        if result['first_all_required_nonempty_at_ms'] is None:
            result['first_all_required_nonempty_at_ms'] = timestamp
        if result['latest_all_required_nonempty_since_ms'] is None:
            result['latest_all_required_nonempty_since_ms'] = timestamp
    else:
        result['latest_all_required_nonempty_since_ms'] = None


def inspect_event(result, dom, event, visit_id):
    timestamp = event.get('timestamp')
    if not isinstance(timestamp, (int, float)) or not START_MS <= timestamp < END_MS:
        return
    result['replay_events_in_window'] += 1
    previous_ts = result['last_event_timestamp_by_visit'].get(visit_id)
    if previous_ts is not None and timestamp < previous_ts:
        result['context_diagnostics']['timestamp_regressions'] += 1
    result['last_event_timestamp_by_visit'][visit_id] = timestamp
    kind, data = event.get('type'), event.get('data', {})
    if kind == 2:
        result['context_diagnostics']['full_snapshots'] += 1
    if kind == 3 and data.get('source') == 5 and not dom.field(data.get('id')):
        result['context_diagnostics']['input_events_without_known_field'] += 1
    if not dom.is_checkout():
        reason = 'missing_checkout_dom'
        if dom.hostname != 'e-com.casa':
            reason = 'missing_or_other_host'
        elif dom.path not in OFFER_PATHS | CHECKOUT_PATHS:
            reason = 'other_or_missing_route'
        result['context_diagnostics'][reason] += 1
        if kind == 3 and data.get('source') == 5 and dom.field(data.get('id')):
            result['context_diagnostics']['known_field_input_excluded_by_context'] += 1
        return
    result['checkout_events'] += 1
    result['first_ts'] = min(result['first_ts'] or timestamp, timestamp)
    result['last_ts'] = max(result['last_ts'] or timestamp, timestamp)
    span = result['visit_spans'].setdefault(visit_id, [timestamp, timestamp])
    span[0], span[1] = min(span[0], timestamp), max(span[1], timestamp)
    if kind == 3 and data.get('source') == 5:
        field = dom.field(data.get('id'))
        if field:
            observe_field(result, field, data.get('text', ''))
    if kind == 3 and data.get('source') == 2:
        field = dom.field(data.get('id'))
        if field:
            result['field_interactions'].add(field)
        node = dom.nodes.get(data.get('id'), {})
        if data.get('type') == 2 and node.get('tagName') == 'button' and node.get('attributes', {}).get('type') == 'submit':
            result['submit_click_observed'] += 1
    if kind != 2 and not (kind == 3 and data.get('source') == 0):
        record_field_count(result, timestamp)
        return
    for node_id in dom.changed:
        node = dom.nodes.get(node_id, {})
        if not dom.visible(node_id):
            continue
        attrs = node.get('attributes', {})
        field = dom.field(node_id)
        if field and 'value' in attrs:
            observe_field(result, field, attrs['value'])
        if node.get('tagName') == 'iframe':
            result['iframe_nodes_seen'].add((visit_id, node_id))
            if 'stripe' in str(attrs.get('name', '')).lower() or 'stripe' in str(attrs.get('title', '')).lower():
                result['stripe_frame_marker_observed'] = True
            try:
                host = urlsplit(str(attrs.get('src', ''))).hostname or ''
            except ValueError:
                host = ''
            if host == 'stripe.com' or host.endswith('.stripe.com') or host == 'stripe.network' or host.endswith('.stripe.network'):
                result['stripe_iframe_observed'] = True
        if node.get('type') != 3:
            continue
        # Match complete, short, known messages rather than arbitrary substrings
        # (especially important for inline scripts and serialized React state).
        text = re.sub(r'\s+', ' ', str(node.get('textContent', ''))).strip()
        if len(text) > 600:
            continue
        if text in PAYMENT_MESSAGES and dom.in_payment_section(node_id):
            code = PAYMENT_MESSAGES[text]
            message = result['exact_payment_messages'].setdefault(code, {
                'allowlisted_message': text, 'first_at_ms': timestamp,
                'last_at_ms': timestamp, 'observations': 0})
            message['first_at_ms'] = min(message['first_at_ms'], timestamp)
            message['last_at_ms'] = max(message['last_at_ms'], timestamp)
            message['observations'] += 1
        for code, pattern in ERROR_PATTERNS.items():
            key = (visit_id, node_id, code)
            if pattern.fullmatch(text) and key not in result['error_keys']:
                result['error_keys'].add(key)
                result['explicit_dom_errors'][code] += 1
    buttons = []
    for node_id, node in dom.nodes.items():
        attrs = node.get('attributes', {})
        if node.get('tagName') != 'button' or attrs.get('type') != 'submit' or not dom.visible(node_id):
            continue
        current = ('disabled' if 'disabled' in attrs else 'enabled', button_kind(dom.text(node_id)))
        if current[1] != 'unknown':
            result['button_states'].add(':'.join(current))
            buttons.append(current)
    if buttons:
        key = (visit_id, buttons[0][0], buttons[0][1])
        if key != result['last_button_key'] and len(result['button_transitions']) < 100:
            result['button_transitions'].append({'at_ms': timestamp,
                'state': buttons[0][0], 'kind': buttons[0][1],
                'required_fields_nonempty': sum(bool(result['latest_fields'].get(field)) for field in REQUIRED_FIELDS)})
            result['last_button_key'] = key
        if timestamp >= (result['last_button_observed_at_ms'] or 0):
            result['last_button_observed_at_ms'] = timestamp
            result['last_button'] = {'state': buttons[0][0], 'kind': buttons[0][1]}
    record_field_count(result, timestamp)


def main():
    paths_sql = ','.join("'" + path + "'" for path in sorted(CHECKOUT_PATHS))
    sessions = json.loads(query(f"""
        SELECT coalesce(json_agg(t.session_id), '[]') FROM (
          SELECT DISTINCT s.session_id
          FROM session s JOIN website_event e USING (session_id, website_id)
          WHERE s.website_id='{SITE}' AND s.country='PT'
            AND e.hostname='e-com.casa'
            AND e.created_at >= '{START}'::timestamptz
            AND e.created_at < '{CUTOFF}'::timestamptz
            AND rtrim(e.url_path, '/') IN ({paths_sql})
        ) AS t
    """))
    if any(not UUID.fullmatch(session_id) for session_id in sessions):
        raise RuntimeError('unexpected_session_id_format')
    prefixes = set(sys.argv[1:])
    if any(not re.fullmatch(r'[a-fA-F0-9]{8}', prefix) for prefix in prefixes):
        raise RuntimeError('invalid_session_prefix_argument')
    if prefixes:
        sessions = [session_id for session_id in sessions if session_id[:8] in prefixes]
    results = {session_id: new_result(session_id) for session_id in sessions}
    if sessions:
        ids = ','.join("'" + session_id + "'" for session_id in sessions)
        sql = f"""SELECT session_id, visit_id, encode(events, 'hex')
          FROM session_replay WHERE website_id='{SITE}' AND session_id IN ({ids})
          AND started_at >= '{PRIMER_START}'::timestamptz
          AND started_at < '{CUTOFF}'::timestamptz
          ORDER BY session_id, visit_id, started_at, chunk_index"""
        proc = subprocess.Popen(PSQL + ['-c', readonly_sql(sql)], stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, text=True, encoding='utf-8')
        current, dom, seen = None, ReplayDOM(), set()
        try:
            for line in proc.stdout:
                parts = line.rstrip('\n').split('\t')
                if len(parts) != 3 or parts[0] not in results:
                    raise RuntimeError('unexpected_replay_query_row')
                session_id, visit_id, encoded = parts
                result = results[session_id]
                result['chunks'] += 1
                if current != (session_id, visit_id):
                    current, dom, seen = (session_id, visit_id), ReplayDOM(), set()
                try:
                    events = json.loads(gzip.decompress(bytes.fromhex(encoded)))
                    if not isinstance(events, list):
                        raise ValueError('unexpected_chunk_shape')
                except (ValueError, OSError, EOFError):
                    result['invalid_chunks'] += 1
                    continue
                for event in events:
                    if not isinstance(event, dict):
                        continue
                    key = (event.get('timestamp'), hash(json.dumps(event, sort_keys=True)))
                    if key in seen:
                        continue
                    seen.add(key)
                    dom.apply(event)
                    inspect_event(result, dom, event, visit_id)
            proc.wait()
            if proc.returncode:
                raise RuntimeError('read_only_replay_query_failed')
        finally:
            if proc.poll() is None:
                # Closing the psql connection also rolls back on parser failure.
                proc.terminate()
                proc.wait()
            proc.stdout.close()
            proc.stderr.close()

    output = []
    for result in results.values():
        first, last = result.pop('first_ts'), result.pop('last_ts')
        spans = result.pop('visit_spans')
        result['checkout_observed_span_seconds'] = round((last - first) / 1000, 1) if first is not None else None
        result['checkout_visit_spans_sum_seconds'] = round(sum(last - first for first, last in spans.values()) / 1000, 1)
        result['checkout_replay_visits'] = len(spans)
        completed_at = result['first_all_required_nonempty_at_ms']
        result['seconds_from_first_all_fields_to_last_checkout_observation'] = round((last - completed_at) / 1000, 1) if completed_at is not None and last is not None else None
        result['first_checkout_observed_at_ms'] = first
        result['last_checkout_observed_at_ms'] = last
        result['button_transitions'].sort(key=lambda entry: entry['at_ms'])
        result['field_count_transitions'].sort(key=lambda entry: entry['at_ms'])
        result['required_fields_nonempty_observed_count'] = len(result.pop('required_fields_nonempty_observed'))
        result['required_fields_nonempty_latest_observed_count'] = sum(bool(result['latest_fields'].get(field)) for field in REQUIRED_FIELDS)
        result['required_fields_total'] = len(REQUIRED_FIELDS)
        result['fields_with_interaction_count'] = len(result.pop('field_interactions'))
        result.pop('latest_fields')
        result.pop('error_keys')
        result.pop('last_button_key')
        result.pop('last_event_timestamp_by_visit')
        result['iframe_nodes_observed_count'] = len(result.pop('iframe_nodes_seen'))
        result['context_diagnostics'] = dict(result['context_diagnostics'])
        result['explicit_dom_errors'] = dict(result['explicit_dom_errors'])
        result['button_states'] = sorted(result['button_states'])
        output.append(result)
    print(json.dumps({'start_utc': START, 'cutoff_utc': CUTOFF,
                      'qualifying_sessions': len(sessions), 'sessions': output,
                      'limitations': [
                          'No field values, arbitrary DOM text, URLs or full session IDs are emitted; messages come only from a fixed allowlist.',
                          'Nonempty masked inputs show presence, not valid delivery or payment details.',
                          'Latest field counts use observed values and may omit unrecorded autofill or masked fields.',
                          'DOM visibility excludes explicit hidden ancestors but cannot evaluate responsive CSS or viewport visibility.',
                          'Explicit error counts are observed DOM messages, not a complete record of gateway errors.',
                          'Stripe iframe presence does not prove it loaded successfully or expose its contents.',
                          'Durations are replay observation spans, not exact active time or abandonment time.',
                          'SPA URL metadata can be stale; dedicated checkout DOM is required on an eligible offer path.',
                          'Events before START only reconstruct DOM; they do not contribute to reported observations.',
                      ]}, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Only an allowlisted status is emitted; never stringify an exception
        # that could embed a database row, DOM payload or customer information.
        print(json.dumps({'error': 'replay_audit_failed', 'error_type': type(error).__name__}))
        sys.exit(1)
