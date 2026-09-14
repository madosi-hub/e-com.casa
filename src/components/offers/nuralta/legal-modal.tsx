"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink } from "lucide-react";
import type { LegalPage } from "./legal-data";

export function LegalModal({
  page,
  open,
  onOpenChange,
}: {
  page: LegalPage | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  // Lock body scroll while modal open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden rounded-2xl border-[#e0d6cb] bg-[#fdfbf9] p-0 sm:max-w-2xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="border-b border-[#e6ded4] px-6 py-5 text-left">
          <DialogTitle className="belmonte-serif text-2xl font-normal text-[#201a17] sm:text-3xl">
            {page?.title}
          </DialogTitle>
          {page?.subtitle && (
            <DialogDescription className="text-sm text-[#7d6f64]">
              {page.subtitle}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(88vh-110px)] flex-1">
          <div className="px-6 py-5">
            {page?.blocks.map((block, i) => {
              switch (block.kind) {
                case "p":
                  return (
                    <p
                      key={i}
                      className="mb-3 text-sm leading-relaxed text-[#3d342e]"
                    >
                      {block.text}
                    </p>
                  );
                case "h3":
                  return (
                    <h3
                      key={i}
                      className="mb-2 mt-6 text-sm font-bold uppercase tracking-[.12em] text-[#8a5a2b]"
                    >
                      {block.text}
                    </h3>
                  );
                case "ul":
                  return (
                    <ul
                      key={i}
                      className="mb-4 ml-4 list-disc space-y-1.5 text-sm leading-relaxed text-[#3d342e]"
                    >
                      {block.items.map((it, j) => (
                        <li key={j}>{it}</li>
                      ))}
                    </ul>
                  );
                case "address":
                  return (
                    <address
                      key={i}
                      className="mb-4 block rounded-lg border border-[#e6ded4] bg-[#f7f3ef] px-4 py-3 not-italic text-sm leading-relaxed text-[#201a17]"
                    >
                      {block.lines.map((line, k) => (
                        <span
                          key={k}
                          className={k > 0 ? "mt-0.5 block" : "block"}
                        >
                          {line}
                        </span>
                      ))}
                    </address>
                  );
                case "external":
                  return (
                    <a
                      key={i}
                      href={block.href}
                      target={block.href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#8a5a2b] underline underline-offset-4 transition hover:text-[#201a17]"
                    >
                      {block.label}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  );
                default:
                  return null;
              }
            })}
            {page?.updated && (
              <p className="mt-6 border-t border-[#e6ded4] pt-4 text-xs text-[#83766d]">
                {page.updated}
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

