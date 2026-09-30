export interface OrderEmailLine {
  slug: string;
  name?: string;
  quantity?: number;
  variantLabel?: string | null;
}

export interface OrderEmailInput {
  orderNumber: string;
  customerEmail: string;
  firstName: string;
  total: string;
  currency: string;
  itemsJson: string;
  trackingNumber?: string | null;
  originWarehouse?: string | null;
}

export interface OrderEmailTemplateInput extends OrderEmailInput {
  items: OrderEmailLine[];
  trackingUrl: string | null;
}

export type OrderNotificationStatus =
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface OrderStatusEmailInput extends OrderEmailInput {
  status: OrderNotificationStatus;
  refundAmount?: string | null;
}

export interface OrderStatusEmailTemplateInput extends OrderEmailTemplateInput {
  status: OrderNotificationStatus;
  refundAmount?: string | null;
}

export interface RenderedOrderEmail {
  profile: 'store' | 'nuralta';
  fromName: string;
  subject: string;
  html: string;
  text: string;
}
