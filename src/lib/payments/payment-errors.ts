// E-com.casa — Payment error normalisation
// Raw gateway responses are never shown to customers. Everything
// is mapped into a small set of stable, customer-safe codes.

import type { PaymentErrorCode } from './payment-types';

export class PaymentError extends Error {
  readonly code: PaymentErrorCode;
  readonly httpStatus: number;
  /** Provider-side code for internal logs only — never returned raw. */
  readonly providerCode?: string;

  constructor(code: PaymentErrorCode, httpStatus = 400, providerCode?: string, message?: string) {
    super(message ?? code);
    this.name = 'PaymentError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.providerCode = providerCode;
  }
}

/** Map a gateway (Stripe-shaped) error to a safe PaymentError. */
export function normaliseGatewayError(status: number, body: unknown): PaymentError {
  const err = body as { error?: { type?: string; code?: string; message?: string; decline_code?: string } } | null;
  const type = err?.error?.type ?? '';
  const code = err?.error?.code ?? err?.error?.decline_code ?? '';

  // Configuration / authentication problems on OUR side.
  if (status === 401 || status === 403 || type === 'invalid_request_error' && /api[_ ]?key/i.test(String(code))) {
    return new PaymentError('PAYMENT_CONFIGURATION_ERROR', 503, code);
  }
  if (status === 404) {
    return new PaymentError('PAYMENT_ORDER_NOT_FOUND', 404, code);
  }
  if (type === 'card_error') {
    if (/cancelled|canceled/.test(String(code))) {
      return new PaymentError('PAYMENT_CANCELLED', 402, code);
    }
    return new PaymentError('PAYMENT_FAILED', 402, code, err?.error?.message);
  }
  if (status === 400 && /payment_method|not available|unsupported/i.test(String(code) + String(type))) {
    return new PaymentError('PAYMENT_METHOD_UNAVAILABLE', 400, code);
  }
  if (status >= 500 || type === 'api_error') {
    return new PaymentError('TEMPORARY_PAYMENT_ERROR', 502, code);
  }
  return new PaymentError('TEMPORARY_PAYMENT_ERROR', 502, code || `http_${status}`);
}

export function toPaymentError(error: unknown): PaymentError {
  if (error instanceof PaymentError) return error;
  if (error instanceof TypeError) {
    // fetch network failure
    return new PaymentError('TEMPORARY_PAYMENT_ERROR', 503, 'network_error');
  }
  return new PaymentError('TEMPORARY_PAYMENT_ERROR', 500, 'unknown_error');
}
