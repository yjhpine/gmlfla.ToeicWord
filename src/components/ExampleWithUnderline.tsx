import type { ReactNode } from "react";

/** 예문에서 학습 단어를 밑줄 처리 */
export function ExampleWithUnderline({
  example,
  word,
  className,
}: {
  example: string;
  word: string;
  className?: string;
}) {
  return <span className={className}>{underlineWord(example, word)}</span>;
}

function underlineWord(example: string, word: string): ReactNode[] {
  const target = word.trim();
  if (!target || !example) return [example];

  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 복수/활용형 느슨 매칭 (빈 문자열 매칭 방지)
  const re = new RegExp(`\\b${escaped}(?:s|es|ed|ing|'s)?\\b`, "gi");

  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(example)) !== null) {
    if (match[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    if (match.index > last) nodes.push(example.slice(last, match.index));
    nodes.push(
      <span
        key={`u-${key}`}
        className="font-semibold text-[var(--accent)] underline decoration-[var(--accent)] decoration-2 underline-offset-[3px]"
      >
        {match[0]}
      </span>,
    );
    key += 1;
    last = match.index + match[0].length;
  }

  if (nodes.length === 0) {
    const idx = example.toLowerCase().indexOf(target.toLowerCase());
    if (idx < 0) return [example];
    return [
      example.slice(0, idx),
      <span
        key="u-0"
        className="font-semibold text-[var(--accent)] underline decoration-[var(--accent)] decoration-2 underline-offset-[3px]"
      >
        {example.slice(idx, idx + target.length)}
      </span>,
      example.slice(idx + target.length),
    ];
  }

  if (last < example.length) nodes.push(example.slice(last));
  return nodes;
}
