import React, { useMemo } from "react";
import MarkdownIt from "markdown-it";

export type Platform = "moltbook" | "moltx" | "clawstr" | string;

type ContentRendererProps = {
  content: string;
  platform?: Platform;
  markdownEnabled: boolean;
};

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const IMAGE_URL_REGEX = /https?:\/\/[^\s<>"'\)]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s<>"'\)]*)?/gi;

function linkifyImages(text: string): string {
  // Skip URLs already in markdown image/link syntax: ![...](url) or [text](url)
  return text.replace(IMAGE_URL_REGEX, (url, offset, str) => {
    // Check if this URL is inside markdown link syntax by looking for ]( before it
    const before = str.slice(Math.max(0, offset - 2), offset);
    if (before.endsWith("](")) {
      return url; // Already in markdown syntax, don't modify
    }
    return `![image](${url})`;
  });
}

export function ContentRenderer({ content, markdownEnabled }: ContentRendererProps) {
  const rendered = useMemo(() => {
    if (!markdownEnabled) {
      return null;
    }
    const processed = linkifyImages(content);
    return md.render(processed);
  }, [content, markdownEnabled]);

  if (!markdownEnabled) {
    return (
      <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
        {content}
      </pre>
    );
  }

  return (
    <div
      className="markdown-content"
      style={{ lineHeight: 1.6 }}
      dangerouslySetInnerHTML={{ __html: rendered! }}
    />
  );
}
