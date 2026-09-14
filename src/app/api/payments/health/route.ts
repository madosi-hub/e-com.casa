import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { getPaymentProvider } from '@/lib/payments/xpayments-provider';
import { isPaymentConfigured, getPaymentConfig } from '@/lib/payments/payments-config';
import { PaymentError } from '@/lib/payments/payment-errors';

export const dynamic = 'force-dynamic';

/**
 * Safe, read-only gateway probe.
 *
 * We intentionally retrieve an impossible PaymentIntent id. A provider 404
 * proves that the XPayments endpoint was reached and accepted the server key,
 * while 401/403 remains a configuration failure. No payment object is created.
 */
export async function GET(req: NextRequest) {
  const limit = rateLimit(req, 'payment-health', 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const cfg = getPaymentConfig();
  if (!isPaymentConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      environment: cfg.environment,
      gatewayReachable: false,
      authenticated: false,
    }, { status: 503 });
  }

  try {
    await getPaymentProvider().retrievePaymentIntent('pi_ecom_connectivity_probe_nonexistent');
    // A provider returning a real object for this sentinel would be unexpected,
    // but still proves transport/authentication is working.
    return NextResponse.json({
      ok: true,
      configured: true,
      environment: cfg.environment,
      gatewayReachable: true,
      authenticated: true,
    });
  } catch (error) {
    if (error instanceof PaymentError && error.code === 'PAYMENT_ORDER_NOT_FOUND') {
      return NextResponse.json({
        ok: true,
        configured: true,
        environment: cfg.environment,
        gatewayReachable: true,
        authenticated: true,
      });
    }
    if (error instanceof PaymentError && error.code === 'PAYMENT_CONFIGURATION_ERROR') {
      return NextResponse.json({
        ok: false,
        configured: true,
        environment: cfg.environment,
        gatewayReachable: true,
        authenticated: false,
      }, { status: 503 });
    }

    console.warn('XPayments connectivity probe inconclusive', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({
      ok: false,
      configured: true,
      environment: cfg.environment,
      gatewayReachable: false,
      authenticated: null,
    }, { status: 503 });
  }
}
