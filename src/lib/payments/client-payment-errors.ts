import type { StripeError } from '@stripe/stripe-js';
import type { PaymentErrorCode } from './payment-types';

export interface PaymentActionResult {
  ok: boolean;
  errorCode?: PaymentErrorCode;
  errorMessage?: string;
  reason?: string;
  providerType?: string;
  providerCode?: string;
  declineCode?: string;
  httpStatus?: number;
  paymentStatus?: 'requires_action';
  multibanco?: { entity: string; reference: string };
}

/** Retain voucher instructions after Stripe's dialog closes; never send to analytics. */
export function multibancoReference(action: unknown): PaymentActionResult['multibanco'] {
  if (!action || typeof action !== 'object' || !('multibanco_display_details' in action)) return undefined;
  const details = action.multibanco_display_details;
  if (!details || typeof details !== 'object' || !('entity' in details) || !('reference' in details)) return undefined;
  const entity = typeof details.entity === 'string' ? details.entity.replace(/\s/g, '') : '';
  const reference = typeof details.reference === 'string' ? details.reference.replace(/\s/g, '') : '';
  return /^\d{5}$/.test(entity) && /^\d{9}$/.test(reference) ? { entity, reference } : undefined;
}

// Explicit allowlists: diagnostics must never contain provider messages, phone
// numbers, payment objects, client secrets or arbitrary response values.
const TYPES = new Set(['validation_error', 'card_error', 'api_error', 'api_connection_error', 'authentication_error', 'invalid_request_error', 'rate_limit_error', 'idempotency_error']);
const CODES = new Set(['incomplete_number', 'incomplete_cvc', 'incomplete_expiry', 'incomplete_phone_number', 'invalid_number', 'invalid_cvc', 'invalid_expiry_month', 'invalid_expiry_year', 'invalid_phone_number', 'expired_card', 'incorrect_cvc', 'card_declined', 'payment_intent_authentication_failure', 'payment_intent_unexpected_state', 'payment_intent_payment_attempt_failed', 'payment_method_unactivated', 'payment_method_unexpected_state', 'processing_error', 'parameter_missing', 'resource_missing', 'rate_limit']);
const DECLINES = new Set(['generic_decline', 'insufficient_funds', 'do_not_honor', 'authentication_required', 'transaction_not_allowed', 'expired_card', 'incorrect_cvc', 'invalid_account', 'processing_error', 'issuer_not_available', 'try_again_later', 'duplicate_transaction', 'canceled']);

export function paymentErrorDetails(error: StripeError) {
  return {
    providerType: TYPES.has(error.type) ? error.type : 'other',
    providerCode: error.code ? CODES.has(error.code) ? error.code : 'other' : undefined,
    declineCode: error.decline_code ? DECLINES.has(error.decline_code) ? error.decline_code : 'other' : undefined,
  };
}

export function paymentFailureMessage(error: StripeError, method?: string): string {
  if (error.type === 'api_connection_error' || error.type === 'api_error') {
    return 'Não foi possível obter a confirmação do pagamento. Verifique o estado da encomenda antes de tentar novamente.';
  }
  if (method === 'mb_way') {
    return 'Verifique se o número de telemóvel está associado ao MB WAY e confirme o pedido na aplicação. Pode tentar novamente ou escolher cartão ou Multibanco.';
  }
  if (method === 'multibanco') {
    return 'Não foi possível gerar a referência Multibanco. Tente novamente ou escolha outro meio de pagamento.';
  }
  return 'O pagamento não foi autorizado. Verifique os dados ou escolha outro meio de pagamento.';
}
