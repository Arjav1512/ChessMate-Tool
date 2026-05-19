interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const parseMarkdown = (text: string) => {
    let html = text;

    html = html.replace(/^### (.*$)/gim, '<h3 style="font-size: 15px; font-weight: 600; margin-top: 14px; margin-bottom: 6px; color: var(--cm-text-primary);">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 16px; font-weight: 600; margin-top: 16px; margin-bottom: 8px; color: var(--cm-text-primary);">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 18px; font-weight: 700; margin-top: 18px; margin-bottom: 10px; color: var(--cm-text-primary);">$1</h1>');

    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong style="font-weight: 700; font-style: italic; color: var(--cm-text-primary);">$1</strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600; color: var(--cm-text-primary);">$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em style="font-style: italic; color: var(--cm-text-secondary);">$1</em>');

    html = html.replace(/^(?:[-*+]|\d+\.)\s+(.+)$/gim, '<li style="margin-left: 16px; margin-bottom: 4px; color: var(--cm-text-primary);">$1</li>');
    html = html.replace(/(<li.*<\/li>)/s, '<ul style="list-style-type: disc; list-style-position: inside; margin: 8px 0;">$1</ul>');

    html = html.replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid var(--cm-border-subtle); margin: 12px 0;" />');

    html = html.replace(/`([^`]+)`/g, '<code style="background: var(--cm-bg-elevated); color: var(--cm-accent); padding: 2px 5px; border-radius: 4px; font-family: var(--font-family-mono); font-size: 12px; border: 1px solid var(--cm-border-subtle);">$1</code>');

    html = html.replace(/\n\n/g, '</p><p style="margin-bottom: 8px; color: var(--cm-text-primary); line-height: 1.6;">');
    html = '<p style="margin-bottom: 8px; color: var(--cm-text-primary); line-height: 1.6;">' + html + '</p>';

    return html;
  };

  return (
    <div
      style={{ maxWidth: '100%', fontSize: '14px' }}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
}
