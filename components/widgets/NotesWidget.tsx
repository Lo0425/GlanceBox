"use client";

import WidgetCard from "@/components/WidgetCard";
import { useUserStorage } from "@/components/useUserStorage";

const LEGACY_STORAGE_KEY = "console-dashboard-notes-v1";

export default function NotesWidget({ onRemove }: { onRemove?: () => void }) {
  const [text, setText] = useUserStorage<string>("notes", "", LEGACY_STORAGE_KEY);

  return (
    <WidgetCard eyebrow="Scratchpad" title="Quick notes" onRemove={onRemove}>
      <div className="h-full flex flex-col gap-3">
        <textarea
          value={text ?? ""}
          onChange={(e) => setText(e.target.value)}
          placeholder="Jot something down…"
          className="flex-1 min-h-0 resize-none bg-surfaceRaised border border-hairline rounded-lg px-4 py-3 text-sm text-ink placeholder:text-faint outline-none focus:border-cyan/60 transition-colors"
        />
        <button
          onClick={() => setText("")}
          className="self-end text-xs font-mono text-faint hover:text-warn transition-colors"
        >
          Clear
        </button>
      </div>
    </WidgetCard>
  );
}
