import React from "react";

function renderLine(line: string, lineIndex: number): React.ReactNode[] {
  const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenIndex = 0;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      const text = line.slice(lastIndex, match.index);
      if (text.length > 0) {
        nodes.push(
          <span key={`text-${lineIndex}-${tokenIndex++}`} className="whitespace-pre-wrap">
            {text}
          </span>,
        );
      }
    }

    const [, label, href] = match;
    nodes.push(
      <a
        key={`link-${lineIndex}-${tokenIndex++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline break-words"
      >
        {label}
      </a>,
    );

    lastIndex = regex.lastIndex;
  }

  const trailing = line.slice(lastIndex);
  if (trailing.length > 0 || nodes.length === 0) {
    nodes.push(
      <span key={`text-${lineIndex}-${tokenIndex++}`} className="whitespace-pre-wrap">
        {trailing}
      </span>,
    );
  }

  return nodes;
}

export function renderRichText(text?: string): React.ReactNode {
  if (!text) {
    return null;
  }

  const lines = text.split(/\n+/);
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    if (index > 0) {
      nodes.push(<br key={`br-${index}`} />);
    }

    nodes.push(...renderLine(line, index));
  });

  return nodes;
}
