import { useLayoutEffect, useRef, useState } from 'react';
import type { ComponentProps } from 'react';
import Markdown, { defaultUrlTransform } from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Options } from 'rehype-sanitize';
import type { ResumePage } from '../types';
import { sanitizeMarkdownStyle } from '../utils/markdownStyles';

/** 只在受控组件上开放样式；脚本、事件属性、iframe 和任意 CSS 均不会进入页面。 */
const markdownSchema: Options = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [...(defaultSchema.attributes?.div ?? []), 'style', 'dataPdfLine', 'dataPdfGraphic', 'dataPdfCanvas'],
    span: [...(defaultSchema.attributes?.span ?? []), 'style'],
    a: [...(defaultSchema.attributes?.a ?? []), 'style', 'ariaLabel'],
    img: [...(defaultSchema.attributes?.img ?? []), 'style'],
  },
  protocols: { ...defaultSchema.protocols, src: ['http', 'https', 'pdf-graphics', 'data'] },
};

/** 图片使用原生属性接口；加载失败提供可见提示，避免用户把空图当作成功还原。 */
type MarkdownImageProps = ComponentProps<'img'>;

const MarkdownImage = ({ src, alt, style, ...props }: MarkdownImageProps) => {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (!src || failedSource === src) return <span className="markdown-image-error" data-export-error="image" role="alert">图片无法加载：{alt || '请检查图片地址'}</span>;
  return <img {...props} src={src} alt={alt ?? ''} style={sanitizeMarkdownStyle(style)}
    crossOrigin={/^https?:/i.test(src) ? 'anonymous' : undefined} onError={() => setFailedSource(src)} />;
};

const components: Components = {
  div: ({ node, style, children }) => {
    const graphic = node?.properties.dataPdfGraphic === 'true';
    const line = typeof node?.properties.dataPdfLine === 'string';
    const canvas = node?.properties.dataPdfCanvas === 'true';
    return <div className={graphic ? 'markdown-original-graphic' : line ? 'markdown-source-line' : canvas ? 'markdown-original-canvas' : undefined}
      style={sanitizeMarkdownStyle(style)}>{children}</div>;
  },
  span: ({ style, children }) => <span style={sanitizeMarkdownStyle(style)}>{children}</span>,
  a: ({ href, title, style, children, 'aria-label': ariaLabel }) => <a
    href={href} title={title} aria-label={ariaLabel} target="_blank" rel="noreferrer"
    className="link-export-target" data-link-url={href} style={sanitizeMarkdownStyle(style)}>{children}</a>,
  img: ({ node: _node, ...props }) => <MarkdownImage {...props} />,
};

/** 将 Markdown 源码渲染为当前导出流程可捕获的独立纸张。 */
type MarkdownPagePreviewProps = {
  /** 原始尺寸与图像资源。 */
  page: ResumePage;
  /** 当前页面源码。 */
  source: string;
  /** 是否取消原位约束并自动重排。 */
  reflow: boolean;
};

export const MarkdownPagePreview = ({ page, source, reflow }: MarkdownPagePreviewProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => {
      const rect = content.getBoundingClientRect();
      const baseHeight = rect.width * page.height / page.width;
      const bottom = Array.from(content.querySelectorAll<HTMLElement>('*')).reduce((maximum, element) =>
        element.getClientRects().length === 0 ? maximum
          : Math.max(maximum, element.getBoundingClientRect().bottom - rect.top), 0);
      setHeight(Math.ceil(Math.max(baseHeight, bottom + (reflow ? rect.width * 0.04 : 0))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    // 原位容器脱离文档流，单独观察文字与图片，确保删减、换行和图片加载后纸张高度同步更新。
    content.querySelectorAll('*').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [source, reflow, page.width, page.height]);

  return (
    <article className={`resume-page resume-page--markdown${reflow ? ' markdown-reflow' : ''}${page.blocks.length ? ' markdown-has-text' : ''}`}
      data-page-width={page.width} aria-label={`第 ${page.page} 页，Markdown 预览`}
      style={{ aspectRatio: height ? undefined : `${page.width} / ${page.height}`, height: height || undefined }}>
      <div ref={contentRef} className="markdown-content">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema]]}
          components={components} urlTransform={(url, key) => {
            if (key === 'src' && url === `pdf-graphics:${page.page}`) return page.graphicsUrl;
            if (key === 'src' && /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z\d+/=\s]+$/i.test(url)) return url;
            return defaultUrlTransform(url);
          }}>{source}</Markdown>
      </div>
    </article>
  );
};
