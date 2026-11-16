import type { ResumeBlock, ResumeBlockType, ResumeLine } from '../types';

const SECTION_TITLES = [
  '教育经历',
  '工作经历',
  '项目经历',
  '个人项目',
  '个人简介',
  '专业技能',
  '技能清单',
  '自我评价',
];

export const createTitle = (content: string, index: number) => {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return `语义块 ${index + 1}`;
  }
  return compact.length > 32 ? `${compact.slice(0, 32)}...` : compact;
};

const isSectionTitle = (text: string) => {
  return SECTION_TITLES.some((title) => text === title);
};

const isContentStarter = (line: ResumeLine, currentLines: ResumeLine[]) => {
  if (currentLines.length === 0) {
    return true;
  }

  const previousLine = currentLines[currentLines.length - 1];
  // 页边界与同基线的独立列始终分块，避免跨页归属错误和双栏相互覆盖。
  if (previousLine.page !== line.page || Math.abs(previousLine.y - line.y) < 3
    || Math.abs(previousLine.x - line.x) > Math.max(line.height * 2, 24)) return true;
  const verticalGap = Math.abs(previousLine.y - line.y);
  const startsAtRoot = line.x <= 38;
  const startsNumberedItem = /^\d+[.、]/.test(line.text);
  const startsLabeledBlock = /^(简介|收益|收益：|负责部分：|技术栈：|业务简介：|业务目标：|工作内容：|仓库地址：|项目地址：|难点细节:?)/.test(
    line.text,
  );

  return (
    startsNumberedItem ||
    startsLabeledBlock ||
    verticalGap > 24 ||
    (startsAtRoot && (previousLine.x > 45 || verticalGap > 18))
  );
};

const createBlock = (
  lines: ResumeLine[],
  type: ResumeBlockType,
  section: string,
  index: number,
): ResumeBlock => {
  const content = lines.map((line) => line.text).join('\n');
  const indent = Math.min(...lines.map((line) => line.x));
  const links = lines.flatMap((line) => line.links);

  return {
    id: `${lines[0].page}-${type}-${index}-${Math.round(lines[0].y)}`,
    page: lines[0].page,
    type,
    section,
    title: type === 'section' ? content : createTitle(content, index),
    content,
    originalContent: content,
    indent,
    sourceLines: lines,
    links: Array.from(new Map(links.map((link) => [link.id, link])).values()),
    isOpen: type !== 'section',
  };
};

export const parseSemanticBlocks = (lines: ResumeLine[]) => {
  const blocks: ResumeBlock[] = [];
  let section = '简历头部';
  let currentLines: ResumeLine[] = [];
  let currentType: ResumeBlockType = 'profile';

  const flush = () => {
    if (currentLines.length === 0) {
      return;
    }

    blocks.push(createBlock(currentLines, currentType, section, blocks.length));
    currentLines = [];
  };

  lines.forEach((line) => {
    if (isSectionTitle(line.text)) {
      flush();
      section = line.text;
      blocks.push(createBlock([line], 'section', section, blocks.length));
      currentType = 'content';
      return;
    }

    const nextType: ResumeBlockType = section === '简历头部' ? 'profile' : 'content';
    if (currentType !== nextType || isContentStarter(line, currentLines)) {
      flush();
      currentType = nextType;
    }

    currentLines.push(line);
  });

  flush();
  return blocks;
};

export const stringifyBlocks = (blocks: ResumeBlock[]) => {
  return blocks
    .map((block) => {
      const linkText =
        block.links.length > 0
          ? `\n${block.links.map((link) => `[${link.label}](${link.url})`).join('\n')}`
          : '';
      return block.type === 'section' ? `# ${block.content}${linkText}` : `${block.content}${linkText}`;
    })
    .join('\n\n');
};

export const getBlockIndentLevel = (block: ResumeBlock) => {
  if (block.type === 'section' || block.type === 'profile') {
    return 0;
  }

  if (block.indent >= 66) {
    return 2;
  }

  if (block.indent >= 46) {
    return 1;
  }

  return 0;
};

