"use client";

import { useState } from "react";
import WidgetCard from "@/components/WidgetCard";
import { useUserStorage } from "@/components/useUserStorage";
import type { TodoItem } from "@/lib/types";

const LEGACY_STORAGE_KEY = "console-dashboard-todos-v1";

export default function TodoWidget({ onRemove }: { onRemove?: () => void }) {
  const [todos, setTodos] = useUserStorage<TodoItem[]>("todos", [], LEGACY_STORAGE_KEY);
  const [draft, setDraft] = useState("");

  function addTodo() {
    const text = draft.trim();
    if (!text) return;
    setTodos((prev) => [...(prev ?? []), { id: crypto.randomUUID(), text, done: false }]);
    setDraft("");
  }

  function toggle(id: string) {
    setTodos((prev) => prev?.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) ?? prev);
  }

  function remove(id: string) {
    setTodos((prev) => prev?.filter((t) => t.id !== id) ?? prev);
  }

  const remaining = todos?.filter((t) => !t.done).length ?? 0;

  return (
    <WidgetCard eyebrow={todos ? `${remaining} left` : ""} title="To-do" onRemove={onRemove}>
      <div className="h-full flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTodo();
            }}
            placeholder="Add a task…"
            className="flex-1 min-w-0 bg-surfaceRaised border border-hairline rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-cyan/60 transition-colors"
          />
          <button
            onClick={addTodo}
            className="text-xs font-mono text-muted hover:text-cyan border border-hairline hover:border-cyan/50 rounded-lg px-3 py-2 transition-all duration-200 hover:shadow-glow-cyan shrink-0"
          >
            Add
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pt-1">
          {todos?.length === 0 && (
            <div className="text-sm text-faint font-mono py-2">Nothing on the list.</div>
          )}
          {todos?.map((t) => (
            <div
              key={t.id}
              className="group flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-surfaceRaised"
            >
              <button
                onClick={() => toggle(t.id)}
                className={`w-4 h-4 rounded-full border shrink-0 transition-colors ${
                  t.done ? "bg-good border-good" : "border-faint"
                }`}
                aria-label={t.done ? "Mark incomplete" : "Mark complete"}
              />
              <span
                className={`flex-1 text-sm truncate ${
                  t.done ? "text-faint line-through" : "text-ink"
                }`}
              >
                {t.text}
              </span>
              <button
                onClick={() => remove(t.id)}
                className="text-faint hover:text-warn opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0"
                aria-label="Delete"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}
