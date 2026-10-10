export interface ContactSummary { id: string; name: string; email: string; orderRef: string | null; subject: string; message: string; createdAt: string; source: 'form' | 'email' }
export interface OrderSummary { id: string; orderNumber: string; email: string; customerName: string; createdAt: string; paidAt: string | null; total: string; currency: string; status: string; paymentStatus: string; trackingNumber: string | null; items: Array<{ name: string; quantity: number; price?: string }> }
export interface EmailSummary { id: string; emailId?: string; direction: 'inbound' | 'outbound'; from: string; to: string[]; subject: string; text: string; createdAt: string; status: string; orderNumber?: string; contactId?: string; type: string; error?: string }
export interface IntegrationStatus { sendingConfigured: boolean; webhookConfigured: boolean; historyNotice: string }
export interface ContactDetail { contact: ContactSummary; orders: OrderSummary[]; linkedOrder: OrderSummary | null; emails: EmailSummary[]; historyLimited: boolean }
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
