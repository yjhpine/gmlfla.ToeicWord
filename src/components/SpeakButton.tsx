"use client";

import { useEffect, useState } from "react";
import { canSpeak, speakEnglish, warmUpVoices } from "@/lib/speech";

type Props = {
  text: string;
  label?: string;
  className?: string;
};

export function SpeakButton({
  text,
  label = "발음 듣기",
  className = "",
}: Props) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(canSpeak());
    warmUpVoices();
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        speakEnglish(text);
      }}
      className={
        className ||
        "mt-4 inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
      }
      aria-label={`${text} 발음 듣기`}
    >
      <span aria-hidden>🔊</span>
      {label}
    </button>
  );
}
