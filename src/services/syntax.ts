import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';

hljs.registerLanguage('bash', bash);

// 代码由 Highlight.js 转成转义后的 HTML，再交给只读代码视图显示。
export function highlightShell(source: string): string {
  return hljs.highlight(source, { language: 'bash', ignoreIllegals: true }).value;
}

export function readCodeInput(event: Event): string {
  return (event.target as HTMLTextAreaElement).value;
}

// 输入框和高亮层使用相同的尺寸，并同步横向与纵向滚动。
export function syncCodeScroll(input: HTMLTextAreaElement | null, highlight: HTMLElement | null): void {
  if (input && highlight) {
    highlight.scrollTop = input.scrollTop;
    highlight.scrollLeft = input.scrollLeft;
  }
}
