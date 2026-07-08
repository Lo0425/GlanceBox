"use client";

import { ReactNode } from "react";

function CornerBracket({ className }: { className: string }) {
  return (
    <span
      className={`pointer-events-none absolute w-3.5 h-3.5 border-cyan/0 group-hover/card:border-cyan/80 transition-colors duration-300 ${className}`}
    />
  );
}

export default function WidgetCard({
  title,
  eyebrow,
  children,
  onRemove,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  onRemove?: () => void;
}) {
  return (
    <div className="group/card relative h-full w-full rounded-2xl border border-hairline bg-surface/90 backdrop-blur-sm flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-glow-cyan">
      <CornerBracket className="-top-px -left-px border-t-2 border-l-2 rounded-tl-lg" />
      <CornerBracket className="-top-px -right-px border-t-2 border-r-2 rounded-tr-lg" />
      <CornerBracket className="-bottom-px -left-px border-b-2 border-l-2 rounded-bl-lg" />
      <CornerBracket className="-bottom-px -right-px border-b-2 border-r-2 rounded-br-lg" />

      <div className="widget-drag-handle cursor-grab active:cursor-grabbing flex items-center justify-between px-5 py-4 border-b border-hairline shrink-0 relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-cyan/0 via-cyan/25 to-cyan/0" />
        <div>
          <div className="text-xs tracking-[0.15em] uppercase text-ink/70 font-mono">
            {eyebrow}
          </div>
          <div className="text-sm font-display font-medium text-ink">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 opacity-40">
            <span className="w-1 h-1 rounded-full bg-muted" />
            <span className="w-1 h-1 rounded-full bg-muted" />
            <span className="w-1 h-1 rounded-full bg-muted" />
            <span className="w-1 h-1 rounded-full bg-muted" />
            <span className="w-1 h-1 rounded-full bg-muted" />
            <span className="w-1 h-1 rounded-full bg-muted" />
          </div>
          {onRemove && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-faint hover:text-warn leading-none text-sm px-0.5 transition-colors"
              aria-label="Remove widget"
              title="Remove widget"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 p-5">{children}</div>
    </div>
  );
}
