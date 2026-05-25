import { Fragment } from 'react';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Parse inline markdown tokens into React elements.
 * Handles ***bold-italic***, **bold**, *italic*, and `code` spans.
 * Uses React elements exclusively — no dangerouslySetInnerHTML.
 */
function parseInline(text: string, keyPrefix: string): React.ReactNode {
  if (!text) return null;

  // Order matters: longer patterns must come before shorter ones so the
  // regex alternation greedy-matches the most specific token first.
  const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);

  return (
    <Fragment>
      {parts.map((part, i) => {
        const key = `${keyPrefix}-${i}`;

        if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
          return (
            <strong key={key} style={{ fontWeight: 700, fontStyle: 'italic', color: 'var(--cm-text-primary)' }}>
              {part.slice(3, -3)}
            </strong>
          );
        }
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return (
            <strong key={key} style={{ fontWeight: 600, color: 'var(--cm-text-primary)' }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <em key={key} style={{ fontStyle: 'italic', color: 'var(--cm-text-secondary)' }}>
              {part.slice(1, -1)}
            </em>
          );
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return (
            <code
              key={key}
              style={{
                background: 'var(--cm-bg-elevated)',
                color: 'var(--cm-accent)',
                padding: '2px 5px',
                borderRadius: '4px',
                fontFamily: 'var(--font-family-mono)',
                fontSize: '12px',
                border: '1px solid var(--cm-border-subtle)',
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        // Plain text segment
        return <Fragment key={key}>{part}</Fragment>;
      })}
    </Fragment>
  );
}

/**
 * Safe Markdown renderer that produces React elements.
 *
 * Supports: headings (# / ## / ###), bold, italic, bold-italic,
 * inline code, horizontal rules, and both ordered and unordered lists.
 *
 * No dangerouslySetInnerHTML — XSS-safe by design.
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={i}
          style={{
            fontSize: '15px',
            fontWeight: 600,
            marginTop: '14px',
            marginBottom: '6px',
            color: 'var(--cm-text-primary)',
          }}
        >
          {parseInline(line.slice(4), `h3-${i}`)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={i}
          style={{
            fontSize: '16px',
            fontWeight: 600,
            marginTop: '16px',
            marginBottom: '8px',
            color: 'var(--cm-text-primary)',
          }}
        >
          {parseInline(line.slice(3), `h2-${i}`)}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={i}
          style={{
            fontSize: '18px',
            fontWeight: 700,
            marginTop: '18px',
            marginBottom: '10px',
            color: 'var(--cm-text-primary)',
          }}
        >
          {parseInline(line.slice(2), `h1-${i}`)}
        </h1>
      );

    // Horizontal rule
    } else if (trimmed === '---') {
      elements.push(
        <hr
          key={i}
          style={{ border: 'none', borderTop: '1px solid var(--cm-border-subtle)', margin: '12px 0' }}
        />
      );

    // Lists — collect all consecutive list items into one <ul>/<ol>
    } else if (/^[-*+]\s/.test(line) || /^\d+\.\s/.test(line)) {
      const isOrdered = /^\d+\.\s/.test(line);
      const listItems: string[] = [];
      const startIndex = i;

      while (i < lines.length && (/^[-*+]\s/.test(lines[i]) || /^\d+\.\s/.test(lines[i]))) {
        listItems.push(lines[i].replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, ''));
        i++;
      }

      const ListTag = isOrdered ? 'ol' : 'ul';
      elements.push(
        <ListTag
          key={`list-${startIndex}`}
          style={{
            listStyleType: isOrdered ? 'decimal' : 'disc',
            listStylePosition: 'inside',
            margin: '8px 0',
            paddingLeft: '16px',
          }}
        >
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: '4px', color: 'var(--cm-text-primary)' }}>
              {parseInline(item, `li-${startIndex}-${idx}`)}
            </li>
          ))}
        </ListTag>
      );
      continue; // i already advanced inside the while loop above

    // Empty lines
    } else if (trimmed === '') {
      // skip — paragraph spacing handled by <p> margins

    // Paragraph
    } else {
      elements.push(
        <p
          key={i}
          style={{ marginBottom: '8px', color: 'var(--cm-text-primary)', lineHeight: '1.6' }}
        >
          {parseInline(line, `p-${i}`)}
        </p>
      );
    }

    i++;
  }

  return (
    <div style={{ maxWidth: '100%', fontSize: '14px' }}>
      {elements}
    </div>
  );
}
