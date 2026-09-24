// Checkout drafts use the existing Order table. Only captured purchases belong
// in order history; refunded/cancelled purchases remain visible after payment.
export const PURCHASE_PAYMENT_STATES = ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'];

export const placedOrderWhere = {
  OR: [
    { paidAt: { not: null } },
    { paymentStatus: { in: PURCHASE_PAYMENT_STATES } },
  ],
};

export function isPlacedOrder(order: { paidAt?: Date | string | null; paymentStatus: string }): boolean {
  return Boolean(order.paidAt) || PURCHASE_PAYMENT_STATES.includes(order.paymentStatus);
}
