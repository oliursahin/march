"use client";

const DUMMY_EVENTS = [
  { id: "1", time: "9:00 AM", title: "Daily standup", duration: "30m" },
  { id: "2", time: "11:00 AM", title: "Design review", duration: "1h" },
  { id: "3", time: "2:00 PM", title: "Focus time", duration: "2h" },
  { id: "4", time: "4:30 PM", title: "1:1 with Alex", duration: "30m" },
];

export function TodayAgenda() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  return (
    <div className="w-full">
      <div className="space-y-1">
        {DUMMY_EVENTS.map((event) => {
          const eventHour = parseHour(event.time);
          const isPast =
            eventHour < currentHour ||
            (eventHour === currentHour && currentMinute > 30);

          return (
            <div
              key={event.id}
              className={`flex items-baseline gap-3 py-1.5 ${
                isPast ? "opacity-40" : ""
              }`}
            >
              <span className="text-xs text-gray-500 w-16 shrink-0 tabular-nums">
                {event.time}
              </span>
              <span className="text-sm text-gray-900 truncate">
                {event.title}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {event.duration}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseHour(time: string): number {
  const match = time.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour;
}
