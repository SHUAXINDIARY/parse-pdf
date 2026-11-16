import { useLayoutEffect, useRef } from 'react';
import type { PdfLine, PdfRect } from '../../../services/pdf/types';
import type { ResumeBlock, ResumePage } from '../types';
import { getBlockBounds, rectStyle } from '../utils/pageLayout';

/** 在原有范围中适配修改文字，未改动的行继续显示原图。 */
type FittedTextProps = {
  /** 当前替换区域的唯一标识。 */
  id: string;
  /** 修改后的正文。 */
  text: string;
  /** 对齐目标区域。 */
  bounds: PdfRect;
  /** 参与覆盖的原始行。 */
  lines: PdfLine[];
  /** 所属页面。 */
  page: ResumePage;
  /** 无法完整显示时反馈到导出入口。 */
  onOverflow: (id: string, overflow: boolean) => void;
};

const FittedText = ({ id, text, bounds, lines, page, onOverflow }: FittedTextProps) => {
  const textRef = useRef<HTMLDivElement>(null);
  const firstLine = lines[0];
  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element || !firstLine) return;
    const fit = () => {
      const pageWidth = element.parentElement?.getBoundingClientRect().width ?? page.width;
      const scale = pageWidth / page.width;
      let low = Math.min(firstLine.height, Math.max(8, firstLine.height * 0.75)) * scale;
      let high = firstLine.height * scale;
      const overflowing = () => element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1;
      // 原字号优先，容不下时才缩小；仍溢出时禁止导出裁切后的文字。
      element.style.fontSize = `${high}px`;
      if (overflowing()) {
        for (let step = 0; step < 12; step += 1) {
          const size = (low + high) / 2;
          element.style.fontSize = `${size}px`;
          if (overflowing()) high = size;
          else low = size;
        }
        element.style.fontSize = `${low}px`;
      }
      onOverflow(id, overflowing());
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => {
      observer.disconnect();
      onOverflow(id, false);
    };
  }, [id, text, firstLine, page.width, onOverflow]);

  return (
    <>
      {lines.map((line) => (
        <span
          key={line.id} className="original-text-mask"
          style={{ ...rectStyle({ ...line.bounds, left: line.bounds.left - 1, top: line.bounds.top - 1,
            width: line.bounds.width + 2, height: line.bounds.height + 2 }, page), background: line.background }}
        />
      ))}
      <div
        ref={textRef} className="original-text-replacement"
        style={{ ...rectStyle(bounds, page), fontFamily: firstLine?.fontFamily, color: firstLine?.color,
          fontSize: `${(firstLine?.height ?? 12) / page.width * 100}cqw` }}
      >{text}</div>
    </>
  );
};

/** 原版文字替换的数据。 */
type TextReplacementProps = {
  /** 当前修改块。 */
  block: ResumeBlock;
  /** 原始页面。 */
  page: ResumePage;
  /** 超出原有区域时的反馈。 */
  onOverflow: (id: string, overflow: boolean) => void;
};

const TextReplacement = ({ block, page, onOverflow }: TextReplacementProps) => {
  const editedLines = block.content.split('\n');
  // 行数不变时逐行替换，保留其他行的原始字号、行距、缩进和字形。
  if (editedLines.length === block.sourceLines.length) {
    return <>{block.sourceLines.map((line, index) => editedLines[index] === line.text ? null : (
      <FittedText key={line.id} id={`${block.id}::${line.id}`} text={editedLines[index] ?? ''}
        bounds={line.bounds} lines={[line]} page={page} onOverflow={onOverflow} />
    ))}</>;
  }
  return <FittedText id={block.id} text={block.content} bounds={getBlockBounds(block)}
    lines={block.sourceLines} page={page} onOverflow={onOverflow} />;
};

/** 原版页面的展示与编辑定位接口。 */
type OriginalPagePreviewProps = {
  /** 原始图像及当前块。 */
  page: ResumePage;
  /** 当前选中块。 */
  selectedId: string | null;
  /** 导出期间禁用编辑。 */
  disabled: boolean;
  /** 选择文字区域。 */
  onSelect: (id: string) => void;
  /** 回报替换文字是否超出原始范围。 */
  onOverflow: (id: string, overflow: boolean) => void;
};

export const OriginalPagePreview = ({ page, selectedId, disabled, onSelect, onOverflow }: OriginalPagePreviewProps) => {
  const editableBlocks = page.blocks.filter((block) => block.sourceLines.length > 0);
  const currentLinks = new Map(page.blocks.flatMap((block) => block.links).map((link) => [link.id, link]));
  return (
    <article className="resume-page resume-page--original"
      style={{ aspectRatio: `${page.width} / ${page.height}` }} data-page-width={page.width}
      aria-label={`第 ${page.page} 页，原版还原`}>
      <img className="original-page-image" src={page.imageUrl} alt={`第 ${page.page} 页原始 PDF`} draggable={false} />
      {editableBlocks.filter((block) => block.content !== block.originalContent).map((block) => (
        <TextReplacement key={block.id} block={block} page={page} onOverflow={onOverflow} />
      ))}
      {Array.from(new Map([...page.links, ...page.blocks.flatMap((block) => block.links)]
        .map((link) => [link.id, currentLinks.get(link.id) ?? link])).values())
        .filter((link) => link.url).map((link) => (
        <a key={link.id} className="original-link link-export-target" style={rectStyle(link.bounds, page)}
          href={(currentLinks.get(link.id) ?? link).url} data-link-url={(currentLinks.get(link.id) ?? link).url}
          target="_blank" rel="noreferrer" aria-label={`打开链接：${link.label}`} tabIndex={-1} />
      ))}
      {editableBlocks.map((block) => (
        <button key={block.id} type="button"
          className={`original-block-target${selectedId === block.id ? ' is-selected' : ''}`}
          style={rectStyle(getBlockBounds(block), page)} aria-label={`编辑：${block.title}`}
          aria-pressed={selectedId === block.id} disabled={disabled} onClick={() => onSelect(block.id)} />
      ))}
    </article>
  );
};
