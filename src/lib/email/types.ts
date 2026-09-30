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

export interface RenderedOrderEmail {
  profile: 'store' | 'nuralta';
  fromName: string;
  subject: string;
  html: string;
  text: string;
}
