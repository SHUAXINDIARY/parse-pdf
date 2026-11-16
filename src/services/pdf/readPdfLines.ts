import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextStyle } from 'pdfjs-dist/types/src/display/api';
import type { PdfLine, PdfLink, PdfRect, PdfSourcePage } from './types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

/** 已转换到显示坐标的文字片段。 */
type PositionedTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 文字的显示范围与字体。 */
  bounds: PdfRect;
  fontFamily: string;
};

/** 仅收窄链接处理所需的外部 annotation 字段。 */
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

/** 把 PDF 坐标矩形转换为左上角原点，支持页面旋转及非零裁切框。 */
const viewportRect = (rect: number[], viewport: ReturnType<pdfjsLib.PDFPageProxy['getViewport']>): PdfRect => {
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = rect;
  const points: number[][] = [
    viewport.convertToViewportPoint(x1, y1), viewport.convertToViewportPoint(x2, y1),
    viewport.convertToViewportPoint(x1, y2), viewport.convertToViewportPoint(x2, y2),
  ];
  const left = Math.min(...points.map((point) => point[0] ?? 0));
  const top = Math.min(...points.map((point) => point[1] ?? 0));
  return { left, top,
    width: Math.max(...points.map((point) => point[0] ?? 0)) - left,
    height: Math.max(...points.map((point) => point[1] ?? 0)) - top };
};

const extractPageLinks = (annotations: PdfAnnotation[], pageNumber: number, viewport: ReturnType<pdfjsLib.PDFPageProxy['getViewport']>) => {
  return annotations
    .map((annotation, index) => {
      const url = getAnnotationUrl(annotation);
      if (typeof url !== 'string' || !url || !annotation.rect || annotation.rect.length < 4 || !annotation.rect.every(Number.isFinite)) {
        return null;
      }

      return {
        id: `${pageNumber}-link-${index}`,
        url,
        label: url,
        page: pageNumber,
        rect: normalizeAnnotationRect(annotation.rect),
        bounds: viewportRect(annotation.rect, viewport),
      };
    })
    .filter((link): link is PdfLink => Boolean(link));
};

const isLinkOnLine = (link: PdfLink, line: PdfLine) => {
  const a = link.bounds;
  const b = line.bounds;
  return a.left < b.left + b.width && a.left + a.width > b.left
    && a.top < b.top + b.height && a.top + a.height > b.top;
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

const buildPageLines = (
  items: TextItem[], pageNumber: number,
  viewport: ReturnType<pdfjsLib.PDFPageProxy['getViewport']>,
  styles: Record<string, TextStyle>,
): PdfLine[] => {
  const positionedItems: PositionedTextItem[] = items.filter((item) => item.str.trim()).map((item) => {
    const transform: number[] = pdfjsLib.Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.max(Math.hypot(transform[2] ?? 0, transform[3] ?? 0), 1);
    const ascent = styles[item.fontName]?.ascent ?? 0.8;
    const angle = Math.atan2(transform[1] ?? 0, transform[0] ?? 1);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const width = Math.max(item.width * viewport.userUnit, 1);
    const x = (transform[4] ?? 0) + sin * fontHeight * ascent;
    const y = (transform[5] ?? 0) - cos * fontHeight * ascent;
    const corners = [
      [x, y], [x + cos * width, y + sin * width],
      [x - sin * fontHeight, y + cos * fontHeight],
      [x + cos * width - sin * fontHeight, y + sin * width + cos * fontHeight],
    ];
    const left = Math.min(...corners.map((point) => point[0]));
    const top = Math.min(...corners.map((point) => point[1]));
    const bounds = { left, top,
      width: Math.max(...corners.map((point) => point[0])) - left,
      height: Math.max(...corners.map((point) => point[1])) - top };
    return {
      str: item.str, x: bounds.left, y: viewport.height - bounds.top,
      width: bounds.width, height: fontHeight, bounds,
      fontFamily: styles[item.fontName]?.fontFamily || 'sans-serif',
    };
  });

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

  // 同一基线中间的大块留白通常是分栏或右对齐日期，不合并为整页长行。
  const segments = lines.flatMap((group) => {
    const sorted = group.sort((a, b) => a.x - b.x);
    const result: PositionedTextItem[][] = [];
    sorted.forEach((item) => {
      const current = result[result.length - 1];
      const previous = current?.[current.length - 1];
      if (!previous || item.x - previous.x - previous.width > Math.max(item.height * 3, 32)) {
        result.push([item]);
      } else current.push(item);
    });
    return result;
  });

  return segments
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
      bounds: {
        left: Math.min(...line.map((item) => item.bounds.left)),
        top: Math.min(...line.map((item) => item.bounds.top)),
        width: Math.max(...line.map((item) => item.bounds.left + item.bounds.width)) - Math.min(...line.map((item) => item.bounds.left)),
        height: Math.max(...line.map((item) => item.bounds.top + item.bounds.height)) - Math.min(...line.map((item) => item.bounds.top)),
      },
      fontFamily: line[0].fontFamily,
      background: '#ffffff',
      color: '#151b26',
      links: [],
    }))
    .filter((line) => line.text);
};

/** 解析文本并保留页面图像；结束后释放 PDF worker 与画布资源。 */
export const readPdfLines = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer });
  const allLines: PdfLine[] = [];
  const sourcePages: PdfSourcePage[] = [];
  try {
    const pdf = await loadingTask.promise;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height) || viewport.width <= 0 || viewport.height <= 0) {
        throw new Error('PDF 页面尺寸无效');
      }
      const [textContent, annotations] = await Promise.all([page.getTextContent(), page.getAnnotations()]);
      const pageLines = buildPageLines(
        textContent.items.filter((item): item is TextItem => 'str' in item),
        pageNumber, viewport, textContent.styles,
      );
      const pageLinks = extractPageLinks(annotations, pageNumber, viewport);
      const canvas = document.createElement('canvas');
      // 按页限制像素数，避免大尺寸 PDF 按固定倍率渲染耗尽内存。
      const scale = Math.min(2, Math.sqrt(8_000_000 / (viewport.width * viewport.height)));
      const renderViewport = page.getViewport({ scale });
      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);
      try {
        await page.render({ canvas, viewport: renderViewport }).promise;
        const context = canvas.getContext('2d');
        const lines = pageLines.map((line) => {
          if (!context) return line;
          // 取文字左侧邻近像素估计底色，减少彩色底板上的覆盖色差。
          const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((line.bounds.left - 2) * scale)));
          const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((line.bounds.top + line.bounds.height / 2) * scale)));
          const [r, g, b] = context.getImageData(x, y, 1, 1).data;
          const left = Math.max(0, Math.min(canvas.width - 1, Math.floor(line.bounds.left * scale)));
          const top = Math.max(0, Math.min(canvas.height - 1, Math.floor(line.bounds.top * scale)));
          const width = Math.max(1, Math.min(canvas.width - left, Math.ceil(line.bounds.width * scale)));
          const height = Math.max(1, Math.min(canvas.height - top, Math.ceil(line.bounds.height * scale)));
          const pixels = context.getImageData(left, top, width, height).data;
          let color = r + g + b < 384 ? '#ffffff' : '#151b26';
          let maxDifference = 0;
          // 抽样原字区域中与底色差异最大的像素，尽量避开抗锯齿边缘色。
          const step = Math.max(1, Math.floor(width * height / 4096));
          for (let pixel = 0; pixel < width * height; pixel += step) {
            const offset = pixel * 4;
            const pr = pixels[offset];
            const pg = pixels[offset + 1];
            const pb = pixels[offset + 2];
            const difference = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
            if (difference > maxDifference) {
              maxDifference = difference;
              color = `rgb(${pr}, ${pg}, ${pb})`;
            }
          }
          return { ...line, background: `rgb(${r}, ${g}, ${b})`, color };
        });
        allLines.push(...attachLinksToLines(lines, pageLinks));
        sourcePages.push({ page: pageNumber, width: viewport.width, height: viewport.height,
          imageUrl: canvas.toDataURL('image/png'), links: pageLinks });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    }
    return { lines: allLines, pageCount: pdf.numPages, sourcePages };
  } finally {
    await loadingTask.destroy();
  }
};
