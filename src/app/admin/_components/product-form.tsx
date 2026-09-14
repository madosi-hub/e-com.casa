import type { Product } from '@prisma/client';
import { archiveProductAction, createProductAction, updateProductAction } from '../actions';
import { inputClass, labelClass, textareaClass } from './ui';

function checkbox(defaultChecked: boolean) {
  return { defaultChecked };
}

export function ProductForm({ product }: { product?: Product | null }) {
  const editing = Boolean(product);
  const action = editing ? updateProductAction : createProductAction;

  return (
    <form action={action} className="space-y-8">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-neutral-950">Publication</h2>
            <p className="mt-1 text-sm text-neutral-500">Only published products are eligible for the storefront.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input type="checkbox" name="published" className="h-4 w-4" {...checkbox(product?.published ?? false)} />
            Published
          </label>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <label className={labelClass}>Name<input name="name" required defaultValue={product?.name ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Slug<input name="slug" required defaultValue={product?.slug ?? ''} className={inputClass} /></label>
          <label className={labelClass}>SKU<input name="sku" required defaultValue={product?.sku ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Brand<input name="brand" defaultValue={product?.brand ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Manufacturer<input name="manufacturer" defaultValue={product?.manufacturer ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Supplier key<input name="supplierKey" defaultValue={product?.supplierKey ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Supplier product ID<input name="supplierProductId" defaultValue={product?.supplierProductId ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Category slug<input name="categorySlug" required defaultValue={product?.categorySlug ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Sort order<input name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} className={inputClass} /></label>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-neutral-950">Commercial data</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-4">
          <label className={labelClass}>Base price<input name="price" required inputMode="decimal" defaultValue={product?.price ?? '0.00'} className={inputClass} /></label>
          <label className={labelClass}>Currency<input name="currency" defaultValue={product?.currency ?? 'EUR'} className={inputClass} /></label>
          <label className={labelClass}>Availability<select name="availability" defaultValue={product?.availability ?? 'inStock'} className={inputClass}><option value="inStock">In stock</option><option value="lowStock">Low stock</option><option value="outOfStock">Out of stock</option></select></label>
          <label className={labelClass}>Shipping class<input name="shippingClass" defaultValue={product?.shippingClass ?? 'STANDARD'} className={inputClass} /></label>
          <label className={labelClass}>Tracked stock<input name="stock" type="number" min="0" defaultValue={product?.stock ?? 0} className={inputClass} /></label>
          <label className="mt-6 flex items-center gap-2 text-sm text-neutral-700"><input name="stockKnown" type="checkbox" className="h-4 w-4" {...checkbox(product?.stockKnown ?? false)} /> Exact stock known</label>
          <label className="mt-6 flex items-center gap-2 text-sm text-neutral-700"><input name="stockUnlimited" type="checkbox" className="h-4 w-4" {...checkbox(product?.stockUnlimited ?? false)} /> Made to order / unlimited</label>
          <label className={labelClass}>Badge<input name="badge" defaultValue={product?.badge ?? ''} className={inputClass} /></label>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-neutral-700"><input name="featured" type="checkbox" className="h-4 w-4" {...checkbox(product?.featured ?? false)} /> Featured</label>
          <label className="flex items-center gap-2 text-sm text-neutral-700"><input name="isBestSeller" type="checkbox" className="h-4 w-4" {...checkbox(product?.isBestSeller ?? false)} /> Best seller</label>
          <label className="flex items-center gap-2 text-sm text-neutral-700"><input name="isNew" type="checkbox" className="h-4 w-4" {...checkbox(product?.isNew ?? false)} /> New arrival</label>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-neutral-950">Content and merchandising</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className={labelClass}>Subtitle<input name="subtitle" defaultValue={product?.subtitle ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Colour<input name="color" defaultValue={product?.color ?? ''} className={inputClass} /></label>
          <label className={`${labelClass} md:col-span-2`}>Short description<textarea name="shortDescription" defaultValue={product?.shortDescription ?? ''} className={textareaClass} /></label>
          <label className={`${labelClass} md:col-span-2`}>Description<textarea name="description" required defaultValue={product?.description ?? ''} className={`${textareaClass} min-h-40`} /></label>
          <label className={labelClass}>Subcategory slugs<input name="subcategorySlugs" defaultValue={product?.subcategorySlugs ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Space slugs<input name="spaceSlugs" defaultValue={product?.spaceSlugs ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Style slugs<input name="styleSlugs" defaultValue={product?.styleSlugs ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Collection slugs<input name="collectionSlugs" defaultValue={product?.collectionSlugs ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Materials<input name="materials" defaultValue={product?.materials ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Dimensions<input name="dimensions" defaultValue={product?.dimensions ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Weight<input name="weight" defaultValue={product?.weight ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Care<input name="care" defaultValue={product?.care ?? ''} className={inputClass} /></label>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-neutral-950">Media and variants</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className={`${labelClass} md:col-span-2`}>Main image URL<input name="image" required defaultValue={product?.image ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Hover image URL<input name="hoverImage" defaultValue={product?.hoverImage ?? ''} className={inputClass} /></label>
          <label className={labelClass}>Image status<input name="imageStatus" defaultValue={product?.imageStatus ?? 'READY'} className={inputClass} /></label>
          <label className={`${labelClass} md:col-span-2`}>Gallery URLs <span className="font-normal text-neutral-400">comma-separated</span><textarea name="gallery" defaultValue={product?.gallery ?? ''} className={textareaClass} /></label>
          <label className={`${labelClass} md:col-span-2`}>Variants JSON<textarea name="variantsJson" defaultValue={product?.variantsJson ?? '[]'} className={`${textareaClass} min-h-48 font-mono text-xs`} /></label>
          <label className={`${labelClass} md:col-span-2`}>Media rights / source note<textarea name="mediaRights" defaultValue={product?.mediaRights ?? ''} className={textareaClass} /></label>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-neutral-950">Compliance and internal controls</h2>
        <p className="mt-1 text-sm text-neutral-500">These fields are operational and are not exposed to customers.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <label className={labelClass}>Compliance status<input name="complianceStatus" defaultValue={product?.complianceStatus ?? 'PENDING_REVIEW'} className={inputClass} /></label>
          <label className={labelClass}>Documentation status<input name="documentationStatus" defaultValue={product?.documentationStatus ?? 'PENDING'} className={inputClass} /></label>
          <label className={labelClass}>Review mode<input name="reviewMode" defaultValue={product?.reviewMode ?? 'live'} className={inputClass} /></label>
          <label className="mt-6 flex items-center gap-2 text-sm text-neutral-700"><input name="requiresComplianceReview" type="checkbox" className="h-4 w-4" {...checkbox(product?.requiresComplianceReview ?? true)} /> Compliance review required</label>
          <label className="mt-6 flex items-center gap-2 text-sm text-neutral-700"><input name="electrical" type="checkbox" className="h-4 w-4" {...checkbox(product?.electrical ?? false)} /> Electrical product</label>
          <label className="mt-6 flex items-center gap-2 text-sm text-neutral-700"><input name="battery" type="checkbox" className="h-4 w-4" {...checkbox(product?.battery ?? false)} /> Contains battery</label>
          <label className={`${labelClass} md:col-span-3`}>Safety JSON<textarea name="safetyJson" defaultValue={product?.safetyJson ?? ''} className={`${textareaClass} font-mono text-xs`} /></label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-6">
        <button type="submit" className="rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">{editing ? 'Save product' : 'Create product'}</button>
        {product ? (
          <button formAction={archiveProductAction} name="id" value={product.id} className="rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Archive from storefront</button>
        ) : null}
      </div>
    </form>
  );
}
