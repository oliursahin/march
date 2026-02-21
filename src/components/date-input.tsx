"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { parseDateInput, formatNice, type DateSuggestion } from "@/lib/parse-date";

export function DateInput({
  objectId,
  initialDate,
}: {
  objectId: string;
  initialDate: Date | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<DateSuggestion[]>([]);
  const [selected, setSelected] = useState(0);
  const [currentDate, setCurrentDate] = useState<Date | null>(initialDate);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestions(parseDateInput(value));
    setSelected(0);
  }, [value]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setValue("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const pickDate = useCallback(
    async (date: Date) => {
      setCurrentDate(date);
      setOpen(false);
      setValue("");

      // Set date + mark as PLANNED
      await Promise.all([
        fetch(`/api/objects/${objectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dueDate: date.toISOString() }),
        }),
        fetch(`/api/objects/${objectId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PLANNED" }),
        }),
      ]);
    },
    [objectId]
  );

  const clearDate = useCallback(async () => {
    setCurrentDate(null);
    setOpen(false);
    setValue("");

    // Clear date + move back to INBOX
    await Promise.all([
      fetch(`/api/objects/${objectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: null }),
      }),
      fetch(`/api/objects/${objectId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INBOX" }),
      }),
    ]);
  }, [objectId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && suggestions[selected]) {
      e.preventDefault();
      pickDate(suggestions[selected].date);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setValue("");
    }
  };

  return (
    <div ref={wrapperRef} className="relative inline-block">
      {open ? (
        <div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="today, tomorrow, fri, 23rd feb..."
            className="text-xs text-gray-700 bg-gray-50 rounded px-2 py-1 w-56 outline-none placeholder:text-gray-400"
            autoFocus
          />

          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg py-1 w-56 z-50">
              {suggestions.map((s, i) => (
                <button
                  key={s.date.toISOString()}
                  onClick={() => pickDate(s.date)}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${
                    i === selected ? "bg-gray-50" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="text-sm text-gray-900">{s.label}</span>
                  <span className="text-xs text-gray-400">
                    {formatNice(s.date)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="text-xs text-gray-400 hover:text-gray-900 transition-colors"
        >
          {currentDate ? (
            <span className="flex items-center gap-2">
              <span className="text-gray-700">{formatNice(currentDate)}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  clearDate();
                }}
                className="text-gray-300 hover:text-gray-500"
              >
                &times;
              </span>
            </span>
          ) : (
            "plan"
          )}
        </button>
      )}
    </div>
  );
}
