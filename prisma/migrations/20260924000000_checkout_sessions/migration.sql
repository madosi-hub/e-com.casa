CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "trackingJson" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "paymentIntentId" TEXT,
    "providerAccount" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "readyAt" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CheckoutSession_reference_key" ON "CheckoutSession"("reference");
CREATE UNIQUE INDEX "CheckoutSession_sessionKey_key" ON "CheckoutSession"("sessionKey");
CREATE UNIQUE INDEX "CheckoutSession_accessToken_key" ON "CheckoutSession"("accessToken");
CREATE UNIQUE INDEX "CheckoutSession_paymentIntentId_key" ON "CheckoutSession"("paymentIntentId");
CREATE UNIQUE INDEX "CheckoutSession_orderId_key" ON "CheckoutSession"("orderId");
CREATE INDEX "CheckoutSession_paymentStatus_updatedAt_idx" ON "CheckoutSession"("paymentStatus", "updatedAt");
