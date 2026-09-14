'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  X,
  Mail,
  SendHorizontal,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatPrice } from '@/lib/format';
import { useT } from '@/hooks/use-t';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

// E-com.casa Concierge — AI shopping assistant (live, /api/chat)
// Suggestions reference real catalogue products, rendered as
// mini cards fetched from /api/products/[slug].

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  isError?: boolean;
}

// Session persistence — conversation survives navigation & reloads within the
// same tab (sessionStorage). Error bubbles are never persisted.
const STORAGE_KEY = 'ecom-concierge-session-v1';
const MAX_STORED = 30;

interface StoredChat {
  messages: ChatMessage[];
  savedAt: number;
}

function loadStoredChat(): { messages: ChatMessage[]; restoredAt: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredChat;
    if (!Array.isArray(parsed.messages)) return null;
    const messages = parsed.messages
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          !m.isError
      )
      .slice(-MAX_STORED);
    return messages.length > 0 ? { messages, restoredAt: Date.now() } : null;
  } catch {
    return null;
  }
}

const QUICK_QUESTION_KEYS = ['chat.q1', 'chat.q2', 'chat.q3', 'chat.q4'];

// Fetched-product cache shared across opens (module scope)
const productCache = new Map<string, Product>();

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function timeLabel() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function ChatWidget() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [restoredNotice, setRestoredNotice] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore the conversation once per tab (after mount, SSR-safe)
  useEffect(() => {
    const stored = loadStoredChat();
    if (stored) {
      setMessages(stored.messages);
      setRestoredNotice(true);
    }
    setHydrated(true);
  }, []);

  // Persist on every change (after hydration to avoid wiping on first render)
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (messages.length === 0) {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } else {
        const persistable = messages.filter((m) => !m.isError).slice(-MAX_STORED);
        window.sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ messages: persistable, savedAt: Date.now() } satisfies StoredChat)
        );
      }
    } catch {
      // Quota/full storage — persistence is best-effort
    }
  }, [messages, hydrated]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Auto-scroll to the newest message
  const lastMessage = messages[messages.length - 1];
  const lastId = lastMessage?.id;
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [lastId, pending, products]);

  // Fetch products referenced by suggestions (missing ones only)
  const suggestionKey = messages
    .flatMap((m) => m.suggestions ?? [])
    .filter((s) => !productCache.has(s))
    .join(',');

  useEffect(() => {
    if (!suggestionKey) return;
    let cancelled = false;
    const slugs = suggestionKey.split(',').filter(Boolean);
    Promise.all(
      slugs.map((slug) =>
        fetch(`/api/products/${slug}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (d?.product ? (d.product as Product) : null))
          .catch(() => null)
      )
    ).then((results) => {
      const found = results.filter((p): p is Product => Boolean(p));
      found.forEach((p) => productCache.set(p.slug, p));
      if (!cancelled && found.length > 0) setProducts((prev) => [...prev, ...found]);
    });
    return () => {
      cancelled = true;
    };
  }, [suggestionKey]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || pending) return;

    const userMessage: ChatMessage = { id: uid(), role: 'user', content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setPending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: c }) => ({ role, content: c })),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content:
              data?.error ??
              'Sorry — something went wrong on our side. Please try again, or email support@e-com.casa.',
            isError: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: 'assistant', content: data.reply, suggestions: data.suggestions ?? [] },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: 'The connection dropped. Please try again, or email support@e-com.casa — we reply within one working day.',
          isError: true,
        },
      ]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  };

  const productFor = (slug: string) => products.find((p) => p.slug === slug) ?? productCache.get(slug);

  const resetChat = () => {
    setMessages([]);
    setPending(false);
    setInput('');
    setRestoredNotice(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={
          open
            ? t('chat.close')
            : messages.length > 0
              ? t('chat.continue')
              : t('chat.open')
        }
        className="fixed bottom-5 right-5 z-[60] flex h-13 w-13 items-center justify-center rounded-full bg-ink text-cream shadow-[0_8px_24px_rgba(29,33,30,0.35)] transition-transform hover:scale-105 md:bottom-6 md:right-6"
        style={{ height: 52, width: 52 }}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5.5 w-5.5" strokeWidth={1.6} />}
        {!open && messages.length > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-terracotta"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label={t('chat.title')}
            className="fixed bottom-[84px] right-5 z-[60] flex max-h-[min(72vh,620px)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-[0_20px_60px_rgba(33,30,27,0.22)] md:right-6"
          >
            {/* Header */}
            <div className="shrink-0 bg-ink px-5 py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-[17px] font-medium text-white">{t('chat.title')}</p>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={resetChat}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-[#a7ada0] transition-colors hover:bg-white/10 hover:text-white"
                    aria-label={t('chat.newChat')}
                  >
                    <RotateCcw className="h-3 w-3" strokeWidth={1.75} /> {t('chat.newChat')}
                  </button>
                )}
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#a7ada0]">
                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7da87b] opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7da87b]" />
                </span>
                {t('chat.online')}
              </p>
            </div>

            {/* Messages */}
            <div
              ref={listRef}
              role="log"
              aria-live="polite"
              aria-label={t('chat.conversation')}
              className="thin-scrollbar min-h-[220px] flex-1 space-y-4 overflow-y-auto p-4"
            >
              {/* Restored-conversation notice */}
              {restoredNotice && messages.length > 0 && (
                <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between gap-2 rounded-full border border-border bg-background/95 px-3.5 py-1.5 backdrop-blur">
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {t('chat.restored')}
                  </p>
                  <button
                    type="button"
                    onClick={resetChat}
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold text-terracotta underline-offset-2 hover:underline"
                  >
                    {t('chat.startFresh')}
                  </button>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="py-1">
                  <div className="rounded-lg rounded-tl-none bg-muted/70 px-4 py-3 text-[13.5px] leading-relaxed text-foreground">
                    {t('chat.greeting')}
                  </div>
                  <p className="mb-2 mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-[#e0a03c]" strokeWidth={1.75} /> {t('chat.tryAsking')}
                  </p>
                  <div className="flex flex-col gap-2">
                    {QUICK_QUESTION_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        disabled={pending}
                        onClick={() => send(t(key))}
                        className="flex min-h-[44px] items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 text-left text-[13px] font-medium transition-colors hover:border-ring hover:bg-accent disabled:opacity-50"
                      >
                        {t(key)}
                        <SendHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                      <div
                        className={
                          m.role === 'user'
                            ? 'max-w-[85%] rounded-xl rounded-br-sm bg-ink px-4 py-2.5 text-[13.5px] leading-relaxed text-cream'
                            : m.isError
                              ? 'max-w-[90%] rounded-xl rounded-bl-sm border border-terracotta/30 bg-terracotta/5 px-4 py-2.5 text-[13.5px] leading-relaxed text-foreground'
                              : 'max-w-[90%] rounded-xl rounded-bl-sm bg-muted/70 px-4 py-2.5 text-[13.5px] leading-relaxed text-foreground'
                        }
                      >
                        {m.content}
                      </div>
                    </div>
                    {/* Product suggestion mini-cards — carousel when more than 2 */}
                    {m.role === 'assistant' && m.suggestions && m.suggestions.length > 0 && (
                      <div
                        className={
                          m.suggestions.length > 2
                            ? 'no-scrollbar -mr-4 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-1 pr-4'
                            : 'mt-2 space-y-2'
                        }
                        role={m.suggestions.length > 2 ? 'region' : undefined}
                        aria-label={m.suggestions.length > 2 ? 'Suggested products — scroll for more' : undefined}
                      >
                        {m.suggestions.map((slug) => {
                          const p = productFor(slug);
                          if (!p) {
                            return (
                              <div
                                key={slug}
                                className={cn(
                                  'flex h-[68px] animate-pulse items-center gap-3 rounded-lg border border-border bg-card px-3',
                                  m.suggestions && m.suggestions.length > 2 && 'w-[210px] shrink-0 snap-start'
                                )}
                                aria-label={t('chat.loadingProduct')}
                              >
                                <div className="h-11 w-11 rounded-md bg-muted" />
                                <div className="flex-1 space-y-1.5">
                                  <div className="h-3 w-3/5 rounded bg-muted" />
                                  <div className="h-3 w-1/4 rounded bg-muted" />
                                </div>
                              </div>
                            );
                          }
                          return (
                            <Link
                              key={slug}
                              href={`/product/${p.slug}`}
                              onClick={() => setOpen(false)}
                              className={cn(
                                'group flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 pr-3.5 transition-all hover:border-ring hover:shadow-[0_4px_16px_rgba(33,30,27,0.08)]',
                                m.suggestions && m.suggestions.length > 2 && 'w-[210px] shrink-0 snap-start'
                              )}
                            >
                              <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                                <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-medium leading-tight group-hover:underline">
                                  {p.name}
                                </span>
                                <span className="mt-0.5 block text-[12px] text-olive">{formatPrice(p.price)}</span>
                              </span>
                              <span className="shrink-0 rounded-full bg-cream px-2.5 py-1 text-[11px] font-semibold text-olive transition-colors group-hover:bg-olive group-hover:text-cream">
                                {t('chat.view')}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                ))
              )}

              {/* Typing indicator */}
              {pending && (
                <div className="flex justify-start" aria-label={t('chat.typing')}>
                  <div className="flex items-center gap-1.5 rounded-xl rounded-bl-sm bg-muted/70 px-4 py-3.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-olive/70"
                        style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.9s' }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              className="shrink-0 border-t border-border bg-background p-3"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <div className="flex items-end gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('chat.inputPlaceholder')}
                  aria-label={t('chat.inputAria')}
                  maxLength={500}
                  disabled={pending}
                  className="h-11 min-w-0 flex-1 rounded-full border border-input bg-muted/50 px-4 text-[13.5px] outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/20 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={pending || !input.trim()}
                  aria-label={t('chat.send')}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-cream transition-all hover:bg-olive disabled:opacity-40"
                >
                  <SendHorizontal className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="shrink-0 border-t border-border bg-muted/40 px-5 py-2.5">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t('chat.disclaimer')}{' '}
                <a href="mailto:support@e-com.casa" className="underline underline-offset-2 hover:text-foreground">
                  <Mail className="mr-0.5 inline h-3 w-3" strokeWidth={1.75} />
                  support@e-com.casa
                </a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
