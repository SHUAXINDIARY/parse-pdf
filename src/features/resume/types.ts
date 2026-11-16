import type { PdfLine, PdfLink, PdfSourcePage } from '../../services/pdf/types';

/** 文件解析状态。 */
export type ParseState = 'idle' | 'reading' | 'done' | 'error';
/** 文件导出状态。 */
export type ExportState = 'idle' | 'exporting' | 'error';
export type { PdfLink as ResumeLink, PdfLine as ResumeLine } from '../../services/pdf/types';
/** 简历内容角色。 */
export type ResumeBlockType = 'profile' | 'section' | 'content';
/** 排版预设，原版为默认模式。 */
export type ResumeLayout = 'original' | 'classic' | 'compact' | 'editorial';

/** 可编辑的语义块，保留来源行以便原版定位。 */
export type ResumeBlock = {
  /** 唯一标识。 */
  id: string;
  /** 来源页码。 */
  page: number;
  /** 内容角色。 */
  type: ResumeBlockType;
  /** 章节名称。 */
  section: string;
  /** 列表显示标题。 */
  title: string;
  /** 当前正文。 */
  content: string;
  /** 原始正文。 */
  originalContent: string;
  /** 原始缩进。 */
  indent: number;
  /** 来源行的几何及字体信息。 */
  sourceLines: PdfLine[];
  /** 可编辑链接。 */
  links: PdfLink[];
  /** 原有折叠编辑器状态。 */
  isOpen: boolean;
};

/** 完整解析结果。 */
export type ParsedPdf = {
  /** 语义块。 */
  blocks: ResumeBlock[];
  /** 页数。 */
  pageCount: number;
  /** 结构化文本。 */
  rawText: string;
  /** 原始页面及其图像。 */
  sourcePages: PdfSourcePage[];
};

/** 将原始页面与当前语义块组合的视图。 */
export type ResumePage = PdfSourcePage & {
  /** 当前页面的编辑内容。 */
  blocks: ResumeBlock[];
};
