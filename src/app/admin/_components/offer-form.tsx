import type { Product, ProductOffer } from '@prisma/client';
import { saveOfferAction } from '../actions';
import { inputClass, labelClass } from './ui';

function localDateTime(date?: Date | null) {
  const value = date ?? new Date();
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function OfferForm({
  offer,
  products,
  selectedProductSlug,
}: {
  offer?: ProductOffer | null;
  products: Array<Pick<Product, 'slug' | 'name' | 'price' | 'currency' | 'published'>>;
  selectedProductSlug?: string;
}) {
  const currentProductSlug = offer?.productSlug ?? selectedProductSlug ?? products[0]?.slug ?? '';
  const mode = offer?.fixedPriceCents != null ? 'fixed' : offer?.discountPct != null ? 'percentage' : 'none';
  const startsAt = offer?.startsAt ?? new Date();
  const defaultEnd = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  return (
    <form action={saveOfferAction} className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="grid gap-5 md:grid-cols-2">
        <label className={labelClass}>
          Product
          <select name="productSlug" defaultValue={currentProductSlug} disabled={Boolean(offer)} className={inputClass}>
            {products.map((product) => (
              <option key={product.slug} value={product.slug}>{product.name} — {product.price} {product.currency}{product.published ? '' : ' (draft)'}</option>
            ))}
          </select>
          {offer ? <input type="hidden" name="productSlug" value={offer.productSlug} /> : null}
        </label>
        <label className={labelClass}>Public funnel slug<input name="slug" required defaultValue={offer?.slug ?? ''} placeholder="product-campaign" className={inputClass} /></label>
        <label className={labelClass}>
          Price treatment
          <select name="discountMode" defaultValue={mode} className={inputClass}>
            <option value="none">Use product base price</option>
            <option value="percentage">Percentage discount</option>
            <option value="fixed">Fixed campaign price</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>Discount %<input name="discountPct" type="number" min="1" max="99" defaultValue={offer?.discountPct ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Fixed price<input name="fixedPrice" inputMode="decimal" defaultValue={offer?.fixedPriceCents != null ? (offer.fixedPriceCents / 100).toFixed(2) : ''} className={inputClass} /></label>
        </div>
        <label className={labelClass}>Starts at<input name="startsAt" type="datetime-local" required defaultValue={localDateTime(startsAt)} className={inputClass} /></label>
        <label className={labelClass}>Ends at<input name="endsAt" type="datetime-local" required defaultValue={localDateTime(offer?.endsAt ?? defaultEnd)} className={inputClass} /></label>
      </div>

      <input type="hidden" name="version" value={offer?.version ?? 0} />
      <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <input type="checkbox" name="enabled" defaultChecked={offer?.enabled ?? false} className="h-4 w-4" />
        Funnel enabled
      </label>

      <div className="rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        A funnel can use the normal product price or apply one campaign price rule. Enabling the funnel does not bypass product publication or stock rules.
      </div>

      <button type="submit" className="rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">Save funnel</button>
    </form>
  );
}
