'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Scale,
  Send,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { EMAILS, COMPANY } from '@/lib/company';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FormState {
  name: string;
  email: string;
  orderRef: string;
  subject: string;
  message: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  orderRef: '',
  subject: '',
  message: '',
};

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email us',
    description: 'For orders, products, delivery and returns.',
    value: EMAILS.support,
    href: `mailto:${EMAILS.support}`,
    valueLabel: EMAILS.support,
  },
  {
    icon: MessageCircle,
    title: 'Live chat',
    description: 'Our concierge answers common questions and passes the rest to the team.',
    value: 'Available through the site interface',
    hint: 'Use the chat button in the bottom-right corner of any page.',
  },
  {
    icon: Scale,
    title: 'Legal matters',
    description: 'Contracts, formal complaints and legal notices.',
    value: EMAILS.legal,
    href: `mailto:${EMAILS.legal}`,
    valueLabel: EMAILS.legal,
  },
  {
    icon: Lock,
    title: 'Privacy matters',
    description: 'Data protection requests and privacy questions.',
    value: EMAILS.privacy,
    href: `mailto:${EMAILS.privacy}`,
    valueLabel: EMAILS.privacy,
  },
  {
    icon: Phone,
    title: 'Phone support',
    description: 'Talk to our team about orders, delivery and returns.',
    value: COMPANY.telephone,
    href: `tel:${COMPANY.telephone.replace(/\s+/g, '')}`,
    valueLabel: `${COMPANY.telephone} — Customers & Support`,
  },
  {
    icon: Send,
    title: 'Response time',
    description: 'We usually reply within one working day, Monday to Friday.',
    value: 'support@e-com.casa',
    href: `mailto:${EMAILS.support}`,
    valueLabel: 'Write to our team',
  },
];

const FAQS = [
  {
    question: 'How long does delivery take?',
    answer:
      'Standard delivery takes 3–5 working days and express delivery 1–2 working days from dispatch. You can find all costs — and the free standard shipping threshold on orders over €50 — on our Shipping page.',
  },
  {
    question: 'How do I return a product?',
    answer:
      'If you are a consumer in the EU or the UK you can withdraw within 14 days of receiving your order. Email returns@e-com.casa with your order number and we will send you return instructions. The full six-step process is described on our Returns page.',
  },
  {
    question: 'Which payment methods can I use?',
    answer:
      'Checkout uses secure payment processing, so you can pay with the major cards and the payment methods available in your country — such as cards, MB WAY and Multibanco in Portugal, Bizum in Spain, BLIK in Poland and Bancontact in Belgium, plus Apple Pay and Google Pay where your device supports them. The methods shown at checkout depend on your location and currency. Prices are displayed with VAT included where applicable.',
  },
  {
    question: 'How can I track my order?',
    answer:
      'Every paid order gets a tracking number as soon as payment is verified. It is shown on your order confirmation page, in your order history and in your dispatch email. Enter it on our Track Your Order page to see the current delivery state, the journey so far and the estimated delivery date. If tracking has not moved for several working days, contact us with your order number and we will investigate with the carrier.',
  },
  {
    question: 'What if my order arrives damaged?',
    answer:
      'Note the damage to the carrier if possible and photograph the packaging and the product. Then contact us with your order number — we will arrange a replacement or refund in line with your statutory rights.',
  },
  {
    question: 'Can I change or cancel my order?',
    answer:
      'If your order has not shipped yet, contact us as soon as possible with your order number and we will do our best to update it. Once it has shipped, you can still use your 14-day right of withdrawal after delivery.',
  },
];

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [sending, setSending] = useState(false);

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          orderRef: form.orderRef.trim() ? form.orderRef.trim() : undefined,
          subject: form.subject,
          message: form.message,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Message could not be sent. Please try again.');
      }
      toast({
        title: 'Message sent',
        description: 'Thank you — our customer care team will get back to you shortly.',
      });
      setForm(INITIAL_FORM);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Message not sent',
        description: err instanceof Error ? err.message : 'Please try again in a moment.',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Hero */}
      <div className="relative h-[280px] w-full overflow-hidden bg-ink md:h-[340px]">
        <Image
          src="/images/space-living-room.jpg"
          alt="Warm minimalist living room with linen sofa and natural light"
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
              <li aria-current="page">Contact</li>
            </ol>
          </nav>
          <h1 className="font-display mt-3 text-3xl font-medium tracking-tight text-white md:text-4xl">
            Need help?
          </h1>
        </div>
      </div>

      {/* Intro */}
      <section className="container-ecom pt-12 lg:pt-16" aria-label="Customer care introduction">
        <p className="mx-auto max-w-2xl text-center text-[15px] leading-relaxed text-muted-foreground">
          Our customer care team is here to help with orders, products, shipping and returns. Choose the channel
          that suits you — or send us a message with the form below.
        </p>
      </section>

      {/* Channels */}
      <section className="container-ecom pt-10 lg:pt-12" aria-label="Contact channels">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNELS.map((c) => (
            <li
              key={c.title}
              id={c.title === 'Live chat' ? 'chat' : undefined}
              className="scroll-mt-28 rounded-md border border-border bg-card p-6 transition-shadow hover:shadow-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent">
                <c.icon className="h-5 w-5 text-olive" strokeWidth={1.5} />
              </span>
              <h2 className="font-display mt-4 text-lg font-medium">{c.title}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{c.description}</p>
              {c.href ? (
                <a
                  href={c.href}
                  className="mt-3 inline-block text-[13.5px] font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {c.valueLabel}
                </a>
              ) : (
                <p className="mt-3 text-[13.5px] font-medium text-foreground">{c.value}</p>
              )}
              {c.hint && <p className="mt-1 text-[12px] text-muted-foreground">{c.hint}</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* Contact form */}
      <section className="container-ecom py-12 lg:py-16" aria-labelledby="form-title">
        <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:gap-16">
          <div>
            <p className="eyebrow text-muted-foreground">Write to us</p>
            <h2 id="form-title" className="font-display mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
              Send us a message
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
              Fields marked with an asterisk (*) are required. If your question is about an existing order,
              adding the order number helps us answer faster.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-3xl rounded-md border border-border bg-card p-6 sm:p-8" noValidate={false}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-name">
                  Name <span aria-hidden="true" className="text-terracotta">*</span>
                </Label>
                <Input id="contact-name" name="name" required value={form.name} onChange={update('name')} placeholder="Your full name" autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">
                  Email <span aria-hidden="true" className="text-terracotta">*</span>
                </Label>
                <Input id="contact-email" name="email" type="email" required value={form.email} onChange={update('email')} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-order">Order number <span className="text-[12px] font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="contact-order" name="orderRef" value={form.orderRef} onChange={update('orderRef')} placeholder="e.g. EC-123456" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-subject">
                  Subject <span aria-hidden="true" className="text-terracotta">*</span>
                </Label>
                <Input id="contact-subject" name="subject" required value={form.subject} onChange={update('subject')} placeholder="What is it about?" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="contact-message">
                  Message <span aria-hidden="true" className="text-terracotta">*</span>
                </Label>
                <Textarea id="contact-message" name="message" required rows={6} value={form.message} onChange={update('message')} placeholder="Tell us what you need help with…" className="min-h-32" />
              </div>
            </div>

            <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
              By sending this form you allow us to process the data above to handle your request, in line with
              our{' '}
              <Link href="/legal/privacy" className="underline underline-offset-2 hover:text-foreground">
                Privacy Policy
              </Link>
              .
            </p>

            <div className="mt-6">
              <Button
                type="submit"
                disabled={sending}
                className="h-11 rounded-md bg-primary px-7 text-[14px] font-medium hover:bg-primary/90"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    Sending…
                  </>
                ) : (
                  <>
                    Send message
                    <Send className="h-4 w-4" strokeWidth={1.75} />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 bg-cream py-12 lg:py-16" aria-labelledby="faq-title">
        <div className="container-ecom">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow text-muted-foreground">Frequently asked questions</p>
            <h2 id="faq-title" className="font-display mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
              Quick answers
            </h2>
            <Accordion type="single" collapsible className="mt-6 rounded-md border border-border bg-card px-5">
              {FAQS.map((faq, i) => (
                <AccordionItem key={faq.question} value={`faq-${i}`}>
                  <AccordionTrigger className="text-[14.5px] font-medium">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-[13.5px] leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <p className="mt-5 text-center text-[13px] text-muted-foreground">
              Still stuck? The{' '}
              <Link href="/shipping" className="text-foreground underline underline-offset-2 hover:text-olive">
                Shipping
              </Link>{' '}
              and{' '}
              <Link href="/returns" className="text-foreground underline underline-offset-2 hover:text-olive">
                Returns
              </Link>{' '}
              pages cover the details.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ structured data for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          }),
        }}
      />
    </>
  );
}
