import type { PdfLink } from '../../services/pdf/types';

export type ParseState = 'idle' | 'reading' | 'done' | 'error';
export type ExportState = 'idle' | 'exporting' | 'error';

export type { PdfLink as ResumeLink, PdfLine as ResumeLine } from '../../services/pdf/types';

export type ResumeBlockType = 'profile' | 'section' | 'content';

export type ResumeBlock = {
  id: string;
  page: number;
  type: ResumeBlockType;
  section: string;
  title: string;
  content: string;
  originalContent: string;
  indent: number;
  links: PdfLink[];
  isOpen: boolean;
};

export type ParsedPdf = {
  blocks: ResumeBlock[];
  pageCount: number;
  rawText: string;
};

export type ResumePage = {
  page: number;
  blocks: ResumeBlock[];
};
