import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { PdfLine, PdfLink } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

type PositionedTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type PdfAnnotation = {
  url?: string | null;
  unsafeUrl?: string;
  rect?: number[];
};

const normalizeText = (value: string) => {
  return value
    .normalize('NFKC')
    .replace(/[\uE000-\uF8FF]+/g, ' · ')
    .replace(/\u0008/g, '')
    .replace(/\s*·\s*/g, ' · ')
    .replace(/(?:·\s*){2,}/g, ' · ')
    .replace(/\s+/g, ' ')
    .replace(/^·\s*/, '')
    .replace(/\s*·$/, '')
    .trim();
};

const shouldInsertSpace = (previous: PositionedTextItem, current: PositionedTextItem) => {
  const previousText = previous.str.trim();
  const currentText = current.str.trim();
  const gap = current.x - (previous.x + previous.width);
  const averageCharWidth = previous.width / Math.max(previousText.length, 1);
  const hasLatinBoundary = /[a-zA-Z0-9)]$/.test(previousText) && /^[a-zA-Z0-9([]/.test(currentText);
  const hasLargeVisualGap = gap > Math.max(averageCharWidth * 1.4, 10);

  return gap > 0 && (hasLatinBoundary || hasLargeVisualGap);
};

const buildLineText = (items: PositionedTextItem[]) => {
  return normalizeText(
    items
      .sort((first, second) => first.x - second.x)
      .reduce((line, item, index, sortedItems) => {
        const text = item.str.trim();
        if (!text) {
          return line;
        }

        if (index === 0) {
          return text;
        }

        return `${line}${shouldInsertSpace(sortedItems[index - 1], item) ? ' ' : ''}${text}`;
      }, ''),
  );
};

const getAnnotationUrl = (annotation: PdfAnnotation) => {
  return annotation.url || annotation.unsafeUrl || '';
};

const normalizeAnnotationRect = (rect: number[]): [number, number, number, number] => {
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = rect;
  return [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
};

const extractPageLinks = (annotations: PdfAnnotation[], pageNumber: number) => {
  return annotations
    .map((annotation, index) => {
      const url = getAnnotationUrl(annotation);
      if (!url || !annotation.rect || annotation.rect.length < 4) {
        return null;
      }

      return {
        id: `${pageNumber}-link-${index}`,
        url,
        label: url,
        page: pageNumber,
        rect: normalizeAnnotationRect(annotation.rect),
      };
    })
    .filter((link): link is PdfLink => Boolean(link));
};

const isLinkOnLine = (link: PdfLink, line: PdfLine) => {
  const [, linkBottom, , linkTop] = link.rect;
  const lineBottom = line.y - line.height * 0.3;
  const lineTop = line.y + line.height * 1.2;
  return linkTop >= lineBottom && linkBottom <= lineTop;
};

const attachLinksToLines = (lines: PdfLine[], links: PdfLink[]) => {
  if (links.length === 0) {
    return lines;
  }

  return lines.map((line) => {
    const lineLinks = links
      .filter((link) => isLinkOnLine(link, line))
      .map((link) => ({
        ...link,
        label: line.text || link.url,
      }));

    return {
      ...line,
      links: lineLinks,
    };
  });
};

const buildPageLines = (items: TextItem[], pageNumber: number) => {
  const positionedItems = items
    .map((item) => ({
      str: item.str,
      x: Number(item.transform[4] ?? 0),
      y: Number(item.transform[5] ?? 0),
      width: item.width,
      height: item.height,
    }))
    .filter((item) => item.str.trim());

  const lines = positionedItems.reduce<PositionedTextItem[][]>((lineGroups, item) => {
    const threshold = Math.max(item.height * 0.55, 3);
    const line = lineGroups.find(
      (group) => Math.abs(group[0].y - item.y) <= threshold,
    );

    if (line) {
      line.push(item);
      return lineGroups;
    }

    lineGroups.push([item]);
    return lineGroups;
  }, []);

  return lines
    .sort((first, second) => {
      const yDiff = second[0].y - first[0].y;
      if (Math.abs(yDiff) > 3) {
        return yDiff;
      }
      return first[0].x - second[0].x;
    })
    .map((line, index) => ({
      id: `${pageNumber}-line-${index}`,
      page: pageNumber,
      text: buildLineText(line),
      x: Math.min(...line.map((item) => item.x)),
      y: line[0].y,
      height: Math.max(...line.map((item) => item.height)),
      links: [],
    }))
    .filter((line) => line.text);
};

export const readPdfLines = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const document = await pdfjsLib.getDocument({ data: buffer }).promise;
  const allLines: PdfLine[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const [textContent, annotations] = await Promise.all([
      page.getTextContent(),
      page.getAnnotations(),
    ]);
    const pageLines = buildPageLines(
      textContent.items.filter((item): item is TextItem => 'str' in item),
      pageNumber,
    );
    const pageLinks = extractPageLinks(annotations as PdfAnnotation[], pageNumber);
    allLines.push(...attachLinksToLines(pageLines, pageLinks));
  }

  return { lines: allLines, pageCount: document.numPages };
};
