const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const MONTH_SHORT: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export interface DateSuggestion {
  label: string;
  date: Date;
}

export function parseDateInput(input: string): DateSuggestion[] {
  const text = input.trim().toLowerCase();
  if (!text) return [];

  const now = new Date();
  const today = startOfDay(now);
  const suggestions: DateSuggestion[] = [];

  // "today"
  if ("today".startsWith(text)) {
    suggestions.push({ label: "Today", date: today });
  }

  // "tomorrow"
  if ("tomorrow".startsWith(text)) {
    suggestions.push({ label: "Tomorrow", date: addDays(today, 1) });
  }

  // "yesterday"
  if ("yesterday".startsWith(text)) {
    suggestions.push({ label: "Yesterday", date: addDays(today, -1) });
  }

  // "next week" (next Monday)
  if ("next week".startsWith(text) && text.length >= 4) {
    const nextMon = nextDayOfWeek(today, 1);
    suggestions.push({ label: "Next week", date: nextMon });
  }

  // "next month" (1st of next month)
  if ("next month".startsWith(text) && text.length >= 5) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + 1, 1);
    suggestions.push({ label: "Next month", date: d });
  }

  // "in N days/weeks"
  const inMatch = text.match(/^in\s+(\d+)\s+(day|days|week|weeks)$/);
  if (inMatch) {
    const n = parseInt(inMatch[1], 10);
    const unit = inMatch[2].startsWith("week") ? 7 : 1;
    const d = addDays(today, n * unit);
    suggestions.push({
      label: `In ${n} ${inMatch[2]}`,
      date: d,
    });
  }

  // Day names — "monday", "tue", etc.
  for (let i = 0; i < DAYS.length; i++) {
    const full = DAYS[i];
    const short = full.slice(0, 3);
    if (full.startsWith(text) || short === text) {
      const next = nextDayOfWeek(today, i);
      suggestions.push({
        label: capitalize(full),
        date: next,
      });
    }
  }

  // "23rd feb", "feb 23", "23 february", "february 23"
  const dateMonthMatch = text.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)$/
  );
  if (dateMonthMatch) {
    const day = parseInt(dateMonthMatch[1], 10);
    const monthIdx = parseMonth(dateMonthMatch[2]);
    if (monthIdx !== -1 && day >= 1 && day <= 31) {
      const d = resolveDate(today, monthIdx, day);
      suggestions.push({ label: formatNice(d), date: d });
    }
  }

  const monthDateMatch = text.match(
    /^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/
  );
  if (monthDateMatch) {
    const monthIdx = parseMonth(monthDateMatch[1]);
    const day = parseInt(monthDateMatch[2], 10);
    if (monthIdx !== -1 && day >= 1 && day <= 31) {
      const d = resolveDate(today, monthIdx, day);
      suggestions.push({ label: formatNice(d), date: d });
    }
  }

  // "23/2", "23-2", "2/23"
  const slashMatch = text.match(/^(\d{1,2})[/\-](\d{1,2})$/);
  if (slashMatch) {
    const a = parseInt(slashMatch[1], 10);
    const b = parseInt(slashMatch[2], 10);
    // Try day/month first, then month/day
    if (b >= 1 && b <= 12 && a >= 1 && a <= 31) {
      const d = resolveDate(today, b - 1, a);
      suggestions.push({ label: formatNice(d), date: d });
    } else if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      const d = resolveDate(today, a - 1, b);
      suggestions.push({ label: formatNice(d), date: d });
    }
  }

  // Deduplicate by date
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    const key = s.date.toISOString().slice(0, 10);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function nextDayOfWeek(from: Date, dayIndex: number): Date {
  const d = new Date(from);
  const diff = (dayIndex - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function parseMonth(s: string): number {
  for (let i = 0; i < MONTHS.length; i++) {
    if (MONTHS[i].startsWith(s) && s.length >= 3) return i;
  }
  if (MONTH_SHORT[s] !== undefined) return MONTH_SHORT[s];
  return -1;
}

function resolveDate(today: Date, month: number, day: number): Date {
  const year = today.getFullYear();
  let d = new Date(year, month, day);
  // If date is in the past, use next year
  if (d < today) {
    d = new Date(year + 1, month, day);
  }
  return d;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatNice(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
