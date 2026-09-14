import { getShipToCountries } from './countries';
import { SHIPPING_OPTIONS } from './constants';
const europe = new Set(getShipToCountries().map(c => c.code));
export function freeShipping(country: string, subtotal: number): boolean {
  const code = country.toUpperCase();
  return code === 'PT' || code === 'ES' || (europe.has(code) && subtotal > 50);
}
export function shippingPrice(country: string, subtotal: number, method = 'standard'): number {
  if (freeShipping(country, subtotal)) return 0;
  return (SHIPPING_OPTIONS.find(o => o.id === method) ?? SHIPPING_OPTIONS[0]).price;
}
