import { PageHeader } from '../../../_components/ui';
import { ProductForm } from '../../../_components/product-form';

export const dynamic = 'force-dynamic';

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="New product" description="Create the catalogue record first. Publish only after commercial and operational review." />
      <ProductForm />
    </>
  );
}
