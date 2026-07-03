import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  LoaderCircle,
  Save,
  Upload,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import './App.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

type ParseState = 'idle' | 'reading' | 'done' | 'error';
type ExportState = 'idle' | 'exporting' | 'error';

type PositionedTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type ResumeLine = {
  id: string;
  page: number;
  text: string;
  x: number;
  y: number;
  height: number;
};

type ResumeBlockType = 'profile' | 'section' | 'content';

type ResumeBlock = {
  id: string;
  page: number;
  type: ResumeBlockType;
  section: string;
  title: string;
  content: string;
  originalContent: string;
  indent: number;
  isOpen: boolean;
};

type ParsedPdf = {
  blocks: ResumeBlock[];
  pageCount: number;
  rawText: string;
};

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

const createTitle = (content: string, index: number) => {
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
    }))
    .filter((line) => line.text);
};

const createBlock = (
  lines: ResumeLine[],
  type: ResumeBlockType,
  section: string,
  index: number,
): ResumeBlock => {
  const content = lines.map((line) => line.text).join('\n');
  const indent = Math.min(...lines.map((line) => line.x));

  return {
    id: `${lines[0].page}-${type}-${index}-${Math.round(lines[0].y)}`,
    page: lines[0].page,
    type,
    section,
    title: type === 'section' ? content : createTitle(content, index),
    content,
    originalContent: content,
    indent,
    isOpen: type !== 'section',
  };
};

const parseSemanticBlocks = (lines: ResumeLine[]) => {
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

const stringifyBlocks = (blocks: ResumeBlock[]) => {
  return blocks
    .map((block) => (block.type === 'section' ? `# ${block.content}` : block.content))
    .join('\n\n');
};

const extractPdfBlocks = async (file: File): Promise<ParsedPdf> => {
  const buffer = await file.arrayBuffer();
  const document = await pdfjsLib.getDocument({ data: buffer }).promise;
  const allLines: ResumeLine[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    allLines.push(
      ...buildPageLines(
        textContent.items.filter((item): item is TextItem => 'str' in item),
        pageNumber,
      ),
    );
  }

  const blocks = parseSemanticBlocks(allLines);

  return {
    blocks,
    pageCount: document.numPages,
    rawText: stringifyBlocks(blocks),
  };
};

const getBlockIndentLevel = (block: ResumeBlock) => {
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

const createExportFileName = (name: string) => {
  const baseName = name.replace(/\.pdf$/i, '').trim() || 'resume';
  return `${baseName}-edited.pdf`;
};

const createPdfPageSize = (canvas: HTMLCanvasElement) => {
  const pageWidth = 210;
  return {
    width: pageWidth,
    height: (canvas.height * pageWidth) / canvas.width,
  };
};

const App = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [fileName, setFileName] = useState('');
  const [blocks, setBlocks] = useState<ResumeBlock[]>([]);
  const [rawText, setRawText] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [parseState, setParseState] = useState<ParseState>('idle');
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [error, setError] = useState('');

  const editedCount = useMemo(
    () =>
      blocks.filter((block) => block.content.trim() !== block.originalContent.trim())
        .length,
    [blocks],
  );

  const pages = useMemo(() => {
    return Array.from({ length: pageCount }, (_, pageIndex) => pageIndex + 1).map(
      (page) => ({
        page,
        blocks: blocks.filter((block) => block.page === page),
      }),
    );
  }, [blocks, pageCount]);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('请选择 PDF 文件。');
      setParseState('error');
      return;
    }

    setParseState('reading');
    setError('');
    setFileName(file.name);

    try {
      const result = await extractPdfBlocks(file);
      setBlocks(result.blocks);
      setRawText(result.rawText);
      setPageCount(result.pageCount);
      setParseState('done');
    } catch {
      setBlocks([]);
      setRawText('');
      setPageCount(0);
      setError('PDF 解析失败，请确认文件没有加密或损坏。');
      setParseState('error');
    }
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks((current) => {
      const nextBlocks = current.map((block, index) =>
        block.id === id
          ? {
              ...block,
              content,
              title: block.type === 'section' ? content : createTitle(content, index),
            }
          : block,
      );
      setRawText(stringifyBlocks(nextBlocks));
      return nextBlocks;
    });
  };

  const toggleBlock = (id: string) => {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id ? { ...block, isOpen: !block.isOpen } : block,
      ),
    );
  };

  const expandAll = () => {
    setBlocks((current) => current.map((block) => ({ ...block, isOpen: true })));
  };

  const collapseAll = () => {
    setBlocks((current) =>
      current.map((block) => ({ ...block, isOpen: block.type === 'section' })),
    );
  };

  const exportPdf = async () => {
    const pageElements = Array.from(
      pagesRef.current?.querySelectorAll<HTMLElement>('.resume-page') ?? [],
    );

    if (pageElements.length === 0) {
      return;
    }

    setExportState('exporting');
    setError('');

    document.body.classList.add('is-exporting');

    try {
      await document.fonts.ready;
      let pdf: jsPDF | null = null;

      for (const [index, pageElement] of pageElements.entries()) {
        const canvas = await html2canvas(pageElement, {
          backgroundColor: '#ffffff',
          scale: Math.min(window.devicePixelRatio || 1, 2),
          useCORS: true,
        });
        const imageData = canvas.toDataURL('image/png');
        const pageSize = createPdfPageSize(canvas);

        if (pdf) {
          pdf.addPage([pageSize.width, pageSize.height], 'portrait');
        } else {
          pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pageSize.width, pageSize.height],
          });
        }

        pdf.addImage(imageData, 'PNG', 0, 0, pageSize.width, pageSize.height);
      }

      pdf?.save(createExportFileName(fileName));
      setExportState('idle');
    } catch {
      setExportState('error');
      setError('PDF 导出失败，请稍后重试。');
    } finally {
      document.body.classList.remove('is-exporting');
    }
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Resume PDF Parser</p>
            <h1>PDF 内容解析与实时编辑</h1>
          </div>
          <button className="primary-action" onClick={() => inputRef.current?.click()}>
            <Upload size={18} />
            上传 PDF
          </button>
          <input
            ref={inputRef}
            className="file-input"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
        </header>

        <section className="summary-grid" aria-label="解析状态">
          <div className="metric-panel">
            <span>文件</span>
            <strong>{fileName || '未上传'}</strong>
          </div>
          <div className="metric-panel">
            <span>页数</span>
            <strong>{pageCount || '-'}</strong>
          </div>
          <div className="metric-panel">
            <span>语义块</span>
            <strong>{blocks.length || '-'}</strong>
          </div>
          <div className="metric-panel">
            <span>已修改块</span>
            <strong>{editedCount || '-'}</strong>
          </div>
        </section>

        {parseState === 'idle' ? (
          <section
            className="upload-zone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          >
            <FileText size={42} />
            <h2>拖入 PDF 或点击上传</h2>
            <p>解析结果会按语义块组织，并尽量保留 PDF 原始层级和缩进。</p>
          </section>
        ) : null}

        {parseState === 'reading' ? (
          <section className="status-panel">
            <LoaderCircle className="spin" size={24} />
            <span>正在解析 PDF 内容...</span>
          </section>
        ) : null}

        {parseState === 'error' ? (
          <section className="status-panel error-panel">
            <FileText size={24} />
            <span>{error}</span>
          </section>
        ) : null}

        {blocks.length > 0 ? (
          <section className="editor-layout">
            <div className="items-panel">
              <div className="panel-heading">
                <div>
                  <h2>PDF 版式预览</h2>
                  <p>按语义块展开编辑，缩进和章节层级会贴近原 PDF。</p>
                </div>
                <div className="toolbar">
                  <button
                    className="export-action"
                    disabled={exportState === 'exporting'}
                    onClick={() => {
                      void exportPdf();
                    }}
                  >
                    {exportState === 'exporting' ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Download size={16} />
                    )}
                    {exportState === 'exporting' ? '导出中' : '导出 PDF'}
                  </button>
                  <button onClick={expandAll}>
                    <ChevronDown size={16} />
                    全部展开
                  </button>
                  <button onClick={collapseAll}>
                    <ChevronRight size={16} />
                    全部收起
                  </button>
                </div>
              </div>

              {exportState === 'error' ? (
                <div className="inline-error">{error}</div>
              ) : null}

              <div className="resume-pages" ref={pagesRef}>
                {pages.map(({ page, blocks: pageBlocks }) => (
                  <article className="resume-page" key={page}>
                    <div className="page-marker">第 {page} 页</div>
                    {pageBlocks.map((block) => (
                      <section
                        className={`semantic-block semantic-block--${block.type} indent-${getBlockIndentLevel(block)}`}
                        key={block.id}
                      >
                        {block.type === 'section' ? (
                          <>
                            <input
                              className="section-title-input"
                              value={block.content}
                              onChange={(event) =>
                                updateBlock(block.id, event.target.value)
                              }
                            />
                            <div className="export-text export-text--section">
                              {block.content}
                            </div>
                          </>
                        ) : (
                          <>
                            <button
                              className="semantic-trigger"
                              onClick={() => toggleBlock(block.id)}
                              aria-expanded={block.isOpen}
                            >
                              {block.isOpen ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                              <span>{block.title}</span>
                            </button>
                            {block.isOpen ? (
                              <textarea
                                className="semantic-editor"
                                value={block.content}
                                onChange={(event) =>
                                  updateBlock(block.id, event.target.value)
                                }
                                rows={Math.min(
                                  12,
                                  Math.max(2, block.content.split('\n').length + 1),
                                )}
                              />
                            ) : null}
                            <div className="export-text">{block.content}</div>
                          </>
                        )}
                      </section>
                    ))}
                  </article>
                ))}
              </div>
            </div>

            <aside className="raw-panel">
              <div className="panel-heading compact">
                <div>
                  <h2>结构化文本</h2>
                  <p>用于对照语义块解析结果。</p>
                </div>
                <Save size={18} />
              </div>
              <textarea
                className="raw-textarea"
                value={rawText}
                onChange={(event) => setRawText(event.target.value)}
              />
            </aside>
          </section>
        ) : null}
      </section>
    </main>
  );
};

export default App;
