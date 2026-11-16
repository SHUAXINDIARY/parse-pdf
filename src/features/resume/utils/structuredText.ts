import type { ResumeBlock, ResumeLink } from '../types';
import { createTitle, stringifyBlocks } from './blocks';

/** 文本中的块范围，独立保存以允许输入未完成的 Markdown 和任意换行。 */
export type StructuredTextRange = {
  /** 对应语义块，保留原 PDF 的坐标与页码。 */
  blockId: string;
  /** 块在当前文本中的起始偏移。 */
  start: number;
  /** 块在当前文本中的结束偏移，不包含结束位置。 */
  end: number;
};

/** 从预览侧更新内容时，同时重建结构化文本及其位置映射。 */
export const serializeStructuredText = (blocks: ResumeBlock[]) => {
  let offset = 0;
  const ranges = blocks.map((block): StructuredTextRange => {
    const text = stringifyBlocks([block]);
    const range = { blockId: block.id, start: offset, end: offset + text.length };
    offset += text.length + 2;
    return range;
  });
  return { rawText: stringifyBlocks(blocks), textRanges: ranges };
};

/** 解析某块的标题与完整链接；未完成的 Markdown 保留为正文，输入不会被重写。 */
const parseBlockDraft = (draft: string, block: ResumeBlock, index: number): ResumeBlock => {
  const links: ResumeLink[] = [];
  const availableLinks = [...block.links];
  const lines = draft.split('\n').filter((line) => {
    const match = /^\[([^\]]*)\]\((.*)\)$/.exec(line);
    if (!match) return true;
    const [, label, url] = match;
    const matchIndex = availableLinks.findIndex((link) => link.label === label);
    const previous = availableLinks.splice(matchIndex >= 0 ? matchIndex : 0, 1)[0];
    const bounds = block.sourceLines[0]?.bounds ?? { left: 0, top: 0, width: 0, height: 0 };
    links.push(previous
      ? { ...previous, label, url }
      : { id: `${block.id}-draft-link-${links.length}`, label, url, page: block.page,
          rect: [0, 0, 0, 0], bounds });
    return false;
  });
  const content = lines.join('\n').replace(/^#(?:[\t ]+|$)/, '');
  const type = /^#(?:[\t ]+|$)/.test(draft) ? 'section' : block.type;
  // 空地址保留来源链接的身份，原版预览据此移除旧链接，而不是回退到原地址。
  const removedLinks = availableLinks.map((link) => ({ ...link, url: '' }));
  return { ...block, type, content, title: type === 'section' ? content : createTitle(content, index),
    links: [...links, ...removedLinks] };
};

/** 按文本差异移动块边界，跨块删除也保留原块供原版预览遮盖已删除文字。 */
export const applyStructuredTextEdit = (
  blocks: ResumeBlock[], ranges: StructuredTextRange[], previous: string, next: string,
) => {
  if (previous === next || ranges.length === 0) return { blocks, textRanges: ranges };
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start += 1;
  let oldEnd = previous.length;
  let newEnd = next.length;
  while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === next[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  const delta = next.length - previous.length;
  let owner = ranges.findIndex((range) => start >= range.start && start <= range.end);
  if (owner < 0) {
    owner = 0;
    ranges.forEach((range, index) => { if (range.start <= start) owner = index; });
  }
  const textRanges = ranges.map((range, index): StructuredTextRange => {
    if (index < owner) return range;
    if (index === owner) return { ...range, end: range.end >= oldEnd ? range.end + delta : newEnd };
    return { ...range,
      start: range.start >= oldEnd ? range.start + delta : newEnd,
      end: range.end >= oldEnd ? range.end + delta : newEnd };
  });
  const linkUpdates = new Map<string, ResumeLink>();
  const updatedBlocks = blocks.map((block, index) => {
    const range = textRanges[index];
    const oldRange = ranges[index];
    if (!range || !oldRange || range.blockId !== block.id) return block;
    const draft = next.slice(range.start, range.end);
    if (draft === previous.slice(oldRange.start, oldRange.end)) return block;
    const updated = parseBlockDraft(draft, block, index);
    updated.links.forEach((link) => linkUpdates.set(link.id, link));
    return updated;
  });
  // 一个 PDF annotation 可能对应多个块，所有引用统一使用最新的地址。
  return { textRanges, blocks: updatedBlocks.map((block) => ({ ...block,
    links: block.links.map((link) => linkUpdates.get(link.id) ?? link) })) };
};
