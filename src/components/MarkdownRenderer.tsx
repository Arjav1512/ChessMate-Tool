interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const parseMarkdown = (text: string) => {
    let html = text;

    html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); margin-top: var(--space-16); margin-bottom: var(--space-8); color: var(--color-text); display: flex; align-items: center; gap: var(--space-8);">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); margin-top: var(--space-16); margin-bottom: var(--space-12); color: var(--color-text); display: flex; align-items: center; gap: var(--space-8);">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); margin-top: var(--space-20); margin-bottom: var(--space-12); color: var(--color-text);">$1</h1>');

    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong style="font-weight: var(--font-weight-bold); font-style: italic;">$1</strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: var(--font-weight-semibold); color: var(--color-text);">$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em style="font-style: italic; color: var(--color-text-secondary);">$1</em>');

    html = html.replace(/^(?:[-*+]|\d+\.)\s+(.+)$/gim, '<li style="margin-left: var(--space-16); margin-bottom: var(--space-4); color: var(--color-text);">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul style="list-style-type: disc; list-style-position: inside; margin: var(--space-8) 0;">$1</ul>');

    html = html.replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid var(--color-border); margin: var(--space-12) 0;" />');

    html = html.replace(/`([^`]+)`/g, '<code style="background: var(--color-secondary); color: var(--color-primary); padding: var(--space-2) var(--space-6); border-radius: var(--radius-sm); font-family: var(--font-family-mono); font-size: var(--font-size-sm);">$1</code>');

    html = html.replace(/\n\n/g, '</p><p style="margin-bottom: var(--space-8); color: var(--color-text); line-height: var(--line-height-normal);">');
    html = '<p style="margin-bottom: var(--space-8); color: var(--color-text); line-height: var(--line-height-normal);">' + html + '</p>';

    return html;
  };

  return (
    <div
      style={{ maxWidth: '100%' }}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
}
