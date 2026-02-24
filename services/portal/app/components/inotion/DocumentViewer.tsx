// DocumentViewer.tsx — Renders Outline document content in the dashboard

"use client";

import { useState, useEffect } from "react";

interface DocumentViewerProps {
  documentId?: string | null;
  content?: string | null;
  title?: string;
  updatedAt?: string | null;
  collection?: string;
}

// Strip any remaining emoji characters (belt-and-suspenders)
function stripEmoji(text: string): string {
  return text.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1f926}-\u{1f937}\u{10000}-\u{10ffff}\u2640-\u2642\u2600-\u2B55\u200d\ufe0f]/gu,
    ""
  ).trim();
}

// Parse and render markdown content without external libraries
// Handles: headings, tables, bold, inline code, horizontal rules, lists
function renderMarkdown(raw: string): React.ReactNode[] {
  const lines = raw.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = stripEmoji(lines[i]);

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} className="border-zinc-200 dark:border-zinc-800 my-6" />);
      i++;
      continue;
    }

    // Headings
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    if (h1) {
      nodes.push(
        <h1 key={i} className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-4 mt-6">
          {h1[1]}
        </h1>
      );
      i++;
      continue;
    }
    if (h2) {
      nodes.push(
        <h2 key={i} className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 tracking-tight mb-3 mt-6 border-b border-zinc-100 dark:border-zinc-800 pb-2">
          {h2[1]}
        </h2>
      );
      i++;
      continue;
    }
    if (h3) {
      nodes.push(
        <h3 key={i} className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-2 mt-4">
          {h3[1]}
        </h3>
      );
      i++;
      continue;
    }

    // Table detection: look for | at start
    if (line.trim().startsWith("|")) {
      // Collect table lines
      const tableLines: string[] = [];
      while (i < lines.length && stripEmoji(lines[i]).trim().startsWith("|")) {
        tableLines.push(stripEmoji(lines[i]));
        i++;
      }
      // Parse table
      const rows = tableLines
        .filter((l) => !l.trim().replace(/[\|\-\s:]/g, "").match(/^$/))
        .map((l) =>
          l
            .split("|")
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            .map((cell) => cell.trim())
        );

      if (rows.length > 0) {
        nodes.push(
          <div key={`table-${i}`} className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  {rows[0].map((cell, ci) => (
                    <th
                      key={ci}
                      className="text-left py-2 px-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className="py-2.5 px-3 text-zinc-700 dark:text-zinc-300 font-mono text-xs"
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // List items
    const bullet = line.match(/^[-*] (.+)/);
    const numbered = line.match(/^\d+\. (.+)/);
    if (bullet || numbered) {
      const items: string[] = [];
      const isOrdered = !!numbered;
      while (
        i < lines.length &&
        (isOrdered
          ? stripEmoji(lines[i]).match(/^\d+\. .+/)
          : stripEmoji(lines[i]).match(/^[-*] .+/))
      ) {
        const m = isOrdered
          ? stripEmoji(lines[i]).match(/^\d+\. (.+)/)
          : stripEmoji(lines[i]).match(/^[-*] (.+)/);
        if (m) items.push(m[1]);
        i++;
      }
      const Tag = isOrdered ? "ol" : "ul";
      nodes.push(
        <Tag
          key={`list-${i}`}
          className={`my-3 pl-5 space-y-1 text-sm text-zinc-700 dark:text-zinc-300 ${
            isOrdered ? "list-decimal" : "list-disc"
          }`}
        >
          {items.map((item, ii) => (
            <li key={ii}>{renderInline(item)}</li>
          ))}
        </Tag>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={i} className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-2">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return nodes;
}

// Inline formatting: bold, inline code, [STATUS] badges
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Split on **bold**, `code`, and [STATUS_TAG]
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[A-Z_]+\])/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(text.slice(last, m.index));
    }
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={m.index} className="font-semibold text-zinc-900 dark:text-zinc-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={m.index}
          className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono text-xs"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.match(/^\[[A-Z_]+\]$/)) {
      // Status badge
      const statusMap: Record<string, string> = {
        "[ACTIVE]":    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900",
        "[FAILED]":    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
        "[IDLE]":      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
        "[PENDING]":   "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
        "[COMPLETED]": "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
        "[CRITICAL]":  "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900",
        "[WARNING]":   "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900",
        "[INFO]":      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900",
        "[PASSED]":    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900",
        "[RUNNING]":   "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-900",
      };
      const cls = statusMap[token] ?? "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
      parts.push(
        <span
          key={m.index}
          className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-mono font-medium ${cls}`}
        >
          {token}
        </span>
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
}

export default function DocumentViewer({
  documentId,
  content,
  title,
  updatedAt,
  collection,
}: DocumentViewerProps) {
  const [docContent, setDocContent] = useState<string | null>(content ?? null);
  const [docTitle, setDocTitle] = useState<string>(title ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (documentId && !content) {
      setLoading(true);
      setError(null);
      fetch(`/api/inotion/docs?id=${encodeURIComponent(documentId)}`)
        .then((r) => r.json())
        .then((data) => {
          setDocContent(data.content ?? null);
          if (data.title) setDocTitle(data.title);
          setLoading(false);
        })
        .catch(() => {
          setError("Failed to load document.");
          setLoading(false);
        });
    }
  }, [documentId, content]);

  useEffect(() => {
    if (content !== undefined) setDocContent(content ?? null);
  }, [content]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-400 dark:text-zinc-600 text-sm">
        Loading document...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 text-red-500 dark:text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (!docContent) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-400 dark:text-zinc-600 text-sm">
        Select a document to view its content.
      </div>
    );
  }

  return (
    <article className="max-w-4xl">
      {/* Document header */}
      {(docTitle || collection || updatedAt) && (
        <header className="mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          {collection && (
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">
              {collection}
            </p>
          )}
          {docTitle && (
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              {docTitle}
            </h1>
          )}
          {updatedAt && (
            <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 mt-2">
              Last updated: {updatedAt}
            </p>
          )}
        </header>
      )}

      {/* Document content */}
      <div className="prose-inotion">{renderMarkdown(docContent)}</div>
    </article>
  );
}
