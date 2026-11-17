import type { CSSProperties } from 'react';

/** 仅允许排版尺寸，排除 CSS 函数、变量和外部资源地址。 */
const length = (value: unknown): string | undefined => typeof value === 'string'
  && /^(?:0|\d+(?:\.\d+)?(?:px|pt|em|rem|%|cqw))$/.test(value.trim()) ? value.trim() : undefined;

const color = (value: unknown): string | undefined => typeof value === 'string'
  && /^(?:#[\da-f]{3,8}|[a-z]+|(?:rgb|hsl)a?\([\d\s.,%/+-]+\))$/i.test(value.trim()) ? value.trim() : undefined;

/** HTML 清洗之后再次限制样式；不允许样式访问网络、覆盖应用工具栏或执行脚本。 */
export const sanitizeMarkdownStyle = (style: CSSProperties | undefined): CSSProperties => {
  if (!style) return {};
  const lineHeight = String(style.lineHeight ?? '');
  const fontFamily = typeof style.fontFamily === 'string' && /^[\w\s,'"\u0080-\uFFFF-]+$/.test(style.fontFamily)
    ? style.fontFamily : undefined;
  return {
    position: style.position === 'absolute' || style.position === 'relative' ? style.position : undefined,
    left: length(style.left), top: length(style.top), width: length(style.width), height: length(style.height),
    minHeight: length(style.minHeight), maxWidth: length(style.maxWidth),
    margin: length(style.margin), marginTop: length(style.marginTop), marginBottom: length(style.marginBottom),
    padding: length(style.padding), fontSize: length(style.fontSize), fontFamily,
    fontWeight: /^(?:normal|bold|[1-9]00)$/.test(String(style.fontWeight)) ? style.fontWeight : undefined,
    fontStyle: style.fontStyle === 'italic' ? 'italic' : undefined,
    lineHeight: /^(?:\d+(?:\.\d+)?)$/.test(lineHeight) ? lineHeight : length(style.lineHeight),
    color: color(style.color), backgroundColor: color(style.backgroundColor),
    textAlign: style.textAlign === 'center' || style.textAlign === 'right' || style.textAlign === 'justify'
      ? style.textAlign : undefined,
    textDecoration: style.textDecoration === 'underline' || style.textDecoration === 'line-through'
      ? style.textDecoration : undefined,
  };
};
