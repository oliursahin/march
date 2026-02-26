"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);

  const handleClick = () => {
    setSpinning(true);
    router.refresh();
    setTimeout(() => setSpinning(false), 600);
  };

  return (
    <button
      onClick={handleClick}
      className="text-gray-400 hover:text-gray-900 transition-colors"
      title="Refresh"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={spinning ? "animate-spin" : ""}
      >
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
      </svg>
    </button>
  );
}
