import type { MarkdownDraft, ResumePage } from '../types';
import type { PdfLine, PdfLink } from '../../../services/pdf/types';

/** 原文中的符号按字面量输出，避免首次进入时被误识别为标题或列表。 */
const escapeMarkdown = (value: string): string => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/([\\`*_[\]{}()#+.!|~>-])/g, '\\$1');

/** HTML 属性只接收编码后的文字，防止 PDF 字体名或标识跳出属性。 */
const attribute = (value: string): string => value.replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const linkDestination = (value: string): string => value
  .replace(/[\s()<>"\\]/g, (character) => encodeURIComponent(character));

/** 只包裹能够在当前行定位的链接，避免修改文字后错误替换另一段内容。 */
const lineMarkdown = (text: string, links: PdfLink[]): string => {
  let offset = 0;
  let source = '';
  const matches = links.map((link) => ({ link, index: text.indexOf(link.label) }))
    .filter(({ link, index }) => link.label && link.url && index >= 0)
    .sort((first, second) => first.index - second.index);
  matches.forEach(({ link, index }) => {
    if (index < offset) return;
    source += `${escapeMarkdown(text.slice(offset, index))}[${escapeMarkdown(link.label)}](${linkDestination(link.url)})`;
    offset = index + link.label.length;
  });
  return source + escapeMarkdown(text.slice(offset));
};

/** 相对页面宽度保存数值，预览缩放时字号和纵向位置一起缩放。 */
const cqw = (value: number, width: number): string => `${(value / width * 100).toFixed(4)}cqw`;

const lineSource = (text: string, line: PdfLine, page: ResumePage, links: PdfLink[]): string => {
  const style = [
    'position: absolute', `left: ${cqw(line.bounds.left, page.width)}`,
    `top: ${cqw(line.bounds.top, page.width)}`,
    // 字体回退后的字宽可能不同，允许使用右侧空白，避免初始稿被原行紧边界截断。
    `width: ${cqw(Math.max(line.bounds.width, page.width - line.bounds.left - 12), page.width)}`,
    `font-size: ${cqw(line.height, page.width)}`, `font-family: ${line.fontFamily.replace(/[;<>]/g, '')}`,
    `color: ${line.color}`, `background-color: ${line.background}`, 'line-height: 1',
  ].join('; ');
  return `<div data-pdf-line="${attribute(line.id)}" style="${attribute(style)}">\n\n${lineMarkdown(text, links)}\n\n</div>`;
};

/** 首次进入 Markdown 时从当前编辑内容建立独立草稿，逐行保留已识别的原稿外观。 */
export const createMarkdownDrafts = (pages: ResumePage[]): MarkdownDraft[] => pages.map((page) => {
  const matchedLinkIds = new Set<string>();
  const currentLinks = new Map(page.blocks.flatMap((block) => block.links).map((link) => [link.id, link]));
  const text = page.blocks.flatMap((block) => {
    const firstLine = block.sourceLines[0];
    if (!firstLine) return [];
    return block.content.split('\n').map((content, index) => {
      const originalLine = block.sourceLines[index];
      const line = originalLine ?? { ...firstLine, id: `${block.id}-extra-${index}`,
        bounds: { ...firstLine.bounds, top: firstLine.bounds.top + index * firstLine.height * 1.3 } };
      const links = (originalLine?.links ?? []).map((link) => currentLinks.get(link.id) ?? link);
      links.forEach((link) => {
        if (link.label && link.url && content.includes(link.label)) matchedLinkIds.add(link.id);
      });
      return lineSource(content, line, page, links);
    });
  });
  const unmatchedLinks = page.links.map((link) => currentLinks.get(link.id) ?? link)
    .filter((link) => link.url && !matchedLinkIds.has(link.id))
    .map((link) => `<a href="${attribute(link.url)}" aria-label="${attribute(link.label || link.url)}" style="position: absolute; left: ${cqw(link.bounds.left, page.width)}; top: ${cqw(link.bounds.top, page.width)}; width: ${cqw(link.bounds.width, page.width)}; height: ${cqw(link.bounds.height, page.width)}"></a>`);
  const source = [
    '<!-- 字号、颜色和位置可直接修改；删除以下底图段落可移除原页图片与装饰。 -->',
    `<div data-pdf-canvas="true" style="min-height: ${cqw(page.height, page.width)}">`,
    `<div data-pdf-graphic="true">\n\n![原页图片与装饰](pdf-graphics:${page.page})\n\n</div>`,
    ...text, ...unmatchedLinks, '</div>',
  ].join('\n\n');
  return { page: page.page, source, originalSource: source };
});
