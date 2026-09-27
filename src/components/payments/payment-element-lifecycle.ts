import type { StripeElements, StripePaymentElement, StripePaymentElementOptions } from '@stripe/stripe-js';

export const PAYMENT_ELEMENT_READY_TIMEOUT_MS = 20_000;

/** Mount one Stripe iframe and stop reporting once it has failed or been disposed. */
export function mountPaymentElement({
  elements,
  container,
  options,
  onReady,
  onLoadError,
}: {
  elements: StripeElements;
  container: HTMLElement;
  options?: StripePaymentElementOptions;
  onReady: () => void;
  onLoadError: (code: string) => void;
}): () => void {
  let paymentElement: StripePaymentElement | undefined;
  let disposed = false;
  let failed = false;
  let ready = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const clearReadinessTimeout = () => {
    if (timeout !== undefined) clearTimeout(timeout);
    timeout = undefined;
  };
  const fail = (code: string) => {
    if (disposed || failed) return;
    failed = true;
    clearReadinessTimeout();
    onLoadError(code);
  };
  const handleReady = () => {
    if (disposed || failed || ready) return;
    ready = true;
    clearReadinessTimeout();
    onReady();
  };
  const handleLoadError = () => fail('payment_element_load_error');

  try {
    paymentElement = elements.create('payment', {
      layout: { type: 'accordion', defaultCollapsed: false, radios: true, spacedAccordionItems: true },
      ...options,
    });
    // Stripe may emit during mount, so subscribe and start the deadline first.
    paymentElement.on('ready', handleReady);
    paymentElement.on('loaderror', handleLoadError);
    timeout = setTimeout(() => {
      if (!ready) fail('payment_element_ready_timeout');
    }, PAYMENT_ELEMENT_READY_TIMEOUT_MS);
    paymentElement.mount(container);
  } catch {
    fail('payment_element_mount_error');
  }

  return () => {
    if (disposed) return;
    disposed = true;
    clearReadinessTimeout();
    if (!paymentElement) return;
    // A disposed Elements group can make any individual cleanup call throw.
    // Still attempt the remaining cleanup, particularly destruction after unmount.
    try { paymentElement.off('ready', handleReady); } catch { /* already destroyed */ }
    try { paymentElement.off('loaderror', handleLoadError); } catch { /* already destroyed */ }
    try { paymentElement.unmount(); } catch { /* already destroyed */ }
    try { paymentElement.destroy(); } catch { /* already destroyed */ }
  };
}
