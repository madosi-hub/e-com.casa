import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDown, Info, Mail, RotateCcw } from 'lucide-react';
import { EMAILS, COMPANY } from '@/lib/company';

export const metadata: Metadata = {
  title: 'Returns & Refunds',
  description:
    'How to return an order, your 14-day right of withdrawal, faulty products, exclusions and refund timing.',
  alternates: { canonical: '/returns' },
};

const STEPS = [
  {
    step: 'Step 1',
    title: 'Contact us',
    text: `Email ${EMAILS.returns} within 14 days of receiving your order, with your order number and the items you wish to return.`,
  },
  {
    step: 'Step 2',
    title: 'Receive return instructions',
    text: 'We reply with instructions for your return, and confirm the return address and any label details.',
  },
  {
    step: 'Step 3',
    title: 'Pack the product',
    text: 'Pack the items securely, ideally in the original packaging, with all parts, accessories and manuals included.',
  },
  {
    step: 'Step 4',
    title: 'Send the product',
    text: 'Ship the parcel following our instructions, and keep your proof of postage until the refund is complete.',
  },
  {
    step: 'Step 5',
    title: 'Inspection',
    text: 'Once the return reaches us, we inspect the items. If anything is unclear, we contact you before proceeding.',
  },
  {
    step: 'Step 6',
    title: 'Refund',
    text: 'We refund to your original payment method — within 14 days of receiving the returned goods or your proof of return, whichever comes first, in line with applicable law.',
  },
];

const WITHDRAWAL_FORM = `To: ${COMPANY.legalName}
${COMPANY.registeredOffice.line1}, ${COMPANY.registeredOffice.line2},
${COMPANY.registeredOffice.city}, ${COMPANY.registeredOffice.postcode}, ${COMPANY.registeredOffice.country}
(Email: ${EMAILS.returns})

I/We (*) hereby give notice that I/We (*) withdraw from my/our (*)
contract of sale for the supply of the following goods:

————————————————————————————————————
(order no. / description of the goods)
————————————————————————————————————

Ordered on (*) / received on (*): __________________________

Name of consumer(s): ______________________________________

Address of consumer(s): ___________________________________

Email of consumer(s): _____________________________________

Signature of consumer(s) (only if this form is notified on paper):

Date: __________________________

(*) Delete as appropriate.`;

export default function ReturnsPage() {
  return (
    <>
      {/* Hero */}
      <div className="relative h-[280px] w-full overflow-hidden bg-ink md:h-[340px]">
        <Image
          src="/images/space-bedroom.jpg"
          alt="Serene bedroom with natural wood bed frame and linen bedding"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-ink/55" aria-hidden="true" />
        <div className="container-ecom absolute inset-0 flex flex-col items-center justify-center text-center">
          <nav aria-label="Breadcrumb" className="text-xs text-white/70">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">Returns</li>
            </ol>
          </nav>
          <h1 className="font-display mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
            Returns &amp; Refunds
          </h1>
        </div>
      </div>

      {/* Intro + steps */}
      <section className="container-ecom pt-12 lg:pt-16" aria-labelledby="how-to-return">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-muted-foreground">How to return an order</p>
          <h2 id="how-to-return" className="font-display mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
            Six steps, no surprises
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            If you are a consumer in the EU or the UK, you have a statutory right to withdraw within 14 days of
            receiving your goods — no reason needed. Here is how the process works.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.step} className="rounded-md border border-border bg-card p-6 transition-shadow hover:shadow-sm">
              <div className="flex items-center justify-between">
                <span className="eyebrow text-terracotta">{s.step}</span>
                <span className="font-display text-xl text-olive/25" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="font-display mt-2.5 text-lg font-medium">{s.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Details */}
      <section className="container-ecom py-12 lg:py-16" aria-label="Returns policy details">
        <div className="mx-auto max-w-3xl space-y-10">
          <section aria-labelledby="withdrawal-title">
            <h2 id="withdrawal-title" className="font-display text-xl font-medium tracking-tight sm:text-2xl">
              Your 14-day right of withdrawal
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
              The withdrawal period expires 14 days after the day you — or a third party indicated by you, other
              than the carrier — receive the goods. If you ordered several items delivered separately, the period
              runs from the day you receive the last item. To exercise the right, simply email{' '}
              <a href={`mailto:${EMAILS.returns}`} className="underline underline-offset-2 hover:text-olive">
                {EMAILS.returns}
              </a>{' '}
              or use the model withdrawal form below, clearly stating that you wish to withdraw.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-foreground/80">
              We refund using the same payment method you used for the original transaction. We may withhold the
              refund until we have received the returned goods or you have supplied evidence of having shipped
              them back. You are only liable for any loss of value caused by handling beyond what is necessary to
              establish the nature, characteristics and functioning of the goods.
            </p>
          </section>

          <section aria-labelledby="faulty-title">
            <h2 id="faulty-title" className="font-display text-xl font-medium tracking-tight sm:text-2xl">
              Faulty, damaged or wrong items
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
              A product that arrives damaged, does not work as described or is not the item you ordered is a
              different case from a change of mind: your statutory rights — including the legal guarantee — apply
              in full, in addition to the withdrawal right. Contact{' '}
              <a href={`mailto:${EMAILS.support}`} className="underline underline-offset-2 hover:text-olive">
                {EMAILS.support}
              </a>{' '}
              with your order number and photos of the issue. For faulty or incorrectly supplied goods we will
              provide return instructions and cover the reasonable return costs, in line with applicable law. See
              our{' '}
              <Link href="/legal/warranty" className="underline underline-offset-2 hover:text-olive">
                Warranty &amp; Legal Guarantee
              </Link>{' '}
              policy for details.
            </p>
          </section>

          <section aria-labelledby="exclusions-title">
            <h2 id="exclusions-title" className="font-display text-xl font-medium tracking-tight sm:text-2xl">
              Exclusions
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
              Where permitted by law, the right of withdrawal does not apply — or may be lost — in the following
              typical cases:
            </p>
            <ul className="mt-4 space-y-2.5 text-[14.5px] text-foreground/80">
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-olive" aria-hidden="true" />
                <span>Goods made to your specifications or clearly personalised.</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-olive" aria-hidden="true" />
                <span>
                  Sealed goods which are not suitable for return for health protection or hygiene reasons, if
                  unsealed after delivery.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-olive" aria-hidden="true" />
                <span>Goods which, after delivery, are inseparably mixed with other items.</span>
              </li>
            </ul>
            <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
              This list is not exhaustive; the law of your country of residence may provide further exceptions —
              or additional protections.
            </p>
          </section>

          <section aria-labelledby="refund-title">
            <h2 id="refund-title" className="font-display text-xl font-medium tracking-tight sm:text-2xl">
              Refund timing and return costs
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-foreground/80">
              Refunds are issued without undue delay and no later than 14 days after the day we receive the
              returned goods, or the day you provide evidence that you have shipped them back — whichever is
              earlier. For change-of-mind withdrawals you bear the direct cost of returning the goods, unless our
              instructions say otherwise (the final return cost policy is pending configuration
              [RETURN_COST_POLICY]).
            </p>
          </section>

          {/* Withdrawal form */}
          <section aria-labelledby="form-title">
            <details className="group rounded-md border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
                <span>
                  <span id="form-title" className="font-display block text-lg font-medium">
                    Model withdrawal form
                  </span>
                  <span className="mt-1 block text-[12.5px] text-muted-foreground">
                    Copyable text — paste it into your return email and fill in the marked fields.
                  </span>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-olive transition-transform group-open:rotate-180">
                  <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
                </span>
              </summary>
              <div className="border-t border-border p-5 sm:p-6">
                <pre className="thin-scrollbar overflow-x-auto whitespace-pre-wrap rounded-md bg-cream p-4 font-mono text-[12.5px] leading-relaxed text-foreground/85">
{WITHDRAWAL_FORM}
                </pre>
                <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                  The physical returns address is confirmed in our reply to your return request and is pending
                  configuration [RETURNS_ADDRESS] — do not send parcels to the registered office.
                </p>
              </div>
            </details>
          </section>

          {/* Contact CTA */}
          <div className="rounded-md border border-border bg-cream p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card">
                  <RotateCcw className="h-5 w-5 text-olive" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="font-display text-lg font-medium">Ready to start a return?</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                    Email us with your order number — we will take it from there.
                  </p>
                </div>
              </div>
              <a
                href={`mailto:${EMAILS.returns}`}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-primary px-6 text-[13.5px] font-medium text-primary-foreground transition-all hover:bg-primary/90"
              >
                <Mail className="h-4 w-4" strokeWidth={1.75} />
                {EMAILS.returns}
              </a>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4 sm:p-5" role="note">
            <div className="flex gap-3">
              <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-olive" strokeWidth={1.5} />
              <p className="text-[13px] leading-relaxed text-foreground/75">
                This page is a summary. The legally binding version — including country-specific details — is
                our{' '}
                <Link href="/legal/returns" className="underline underline-offset-2 hover:text-olive">
                  Returns &amp; Right of Withdrawal policy
                </Link>
                . Where national law gives you additional protection, that law prevails.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
