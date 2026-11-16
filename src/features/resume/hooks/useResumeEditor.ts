import { useMemo, useReducer, useRef } from 'react';
import { extractPdfBlocks } from '../utils/extractPdfBlocks';
import type { PdfSourcePage } from '../../../services/pdf/types';
import { getPdfErrorMessage, getPdfErrorName, PdfReadError } from '../../../services/pdf/errors';
import type { ParsedPdf, ParseState, ResumeBlock } from '../types';
import { createTitle, stringifyBlocks } from '../utils/blocks';

/** 编辑器状态，原始页面和可编辑数据分开存储。 */
type EditorState = {
  /** 各页原始图像、尺寸和链接。 */
  sourcePages: PdfSourcePage[];
  /** 当前文件名。 */
  fileName: string;
  /** 可编辑语义块。 */
  blocks: ResumeBlock[];
  /** 可独立编辑的结构化文本。 */
  rawText: string;
  /** 总页数，包括纯图片页。 */
  pageCount: number;
  /** 解析进度状态。 */
  parseState: ParseState;
  /** 解析错误信息。 */
  error: string;
};

/** 编辑器状态更新事件。 */
type EditorAction =
  | { type: 'reading'; fileName: string }
  | { type: 'loaded'; result: ParsedPdf }
  | { type: 'failed'; error: string; clearDocument: boolean }
  | { type: 'content'; id: string; content: string }
  | { type: 'link'; blockId: string; linkId: string; url: string }
  | { type: 'toggle'; id: string }
  | { type: 'expand' | 'collapse' }
  | { type: 'rawText'; value: string };

const initialState: EditorState = {
  sourcePages: [],
  fileName: '',
  blocks: [],
  rawText: '',
  pageCount: 0,
  parseState: 'idle',
  error: '',
};

const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'reading':
      return { ...state, fileName: action.fileName, parseState: 'reading', error: '' };
    case 'loaded':
      return { ...state, ...action.result, parseState: 'done' };
    case 'failed':
      return {
        ...state,
        ...(action.clearDocument ? { blocks: [], rawText: '', pageCount: 0, sourcePages: [] } : {}),
        parseState: 'error', error: action.error,
      };
    case 'rawText':
      return { ...state, rawText: action.value };
    case 'content': {
      const blocks = state.blocks.map((block, index) =>
        block.id === action.id
          ? {
              ...block,
              content: action.content,
              title: block.type === 'section'
                ? action.content
                : createTitle(action.content, index),
            }
          : block,
      );
      return { ...state, blocks, rawText: stringifyBlocks(blocks) };
    }
    case 'link': {
      if (!state.blocks.some((block) => block.id === action.blockId)) return state;
      const blocks = state.blocks.map((block) =>
        block.links.some((link) => link.id === action.linkId)
          ? {
              ...block,
              links: block.links.map((link) =>
                link.id === action.linkId ? { ...link, url: action.url } : link,
              ),
            }
          : block,
      );
      return { ...state, blocks, rawText: stringifyBlocks(blocks) };
    }
    case 'toggle':
      return {
        ...state,
        blocks: state.blocks.map((block) =>
          block.id === action.id ? { ...block, isOpen: !block.isOpen } : block,
        ),
      };
    case 'expand':
    case 'collapse':
      return {
        ...state,
        blocks: state.blocks.map((block) => ({
          ...block,
          isOpen: action.type === 'expand' || block.type === 'section',
        })),
      };
  }
};

export const useResumeEditor = () => {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const requestIdRef = useRef(0);
  const editedCount = useMemo(() => state.blocks.filter(
    (block) => block.content.trim() !== block.originalContent.trim(),
  ).length, [state.blocks]);
  const pages = useMemo(() => state.sourcePages.map((sourcePage) => ({
    ...sourcePage,
    blocks: state.blocks.filter((block) => block.page === sourcePage.page),
  })), [state.blocks, state.sourcePages]);

  const handleFile = async (file: File) => {
    const requestId = ++requestIdRef.current;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      dispatch({ type: 'failed', error: '请选择 PDF 文件。', clearDocument: false });
      return;
    }
    dispatch({ type: 'reading', fileName: file.name });
    try {
      const result = await extractPdfBlocks(file);
      // 连续上传时只接受最近一次结果，避免旧图像覆盖新文档。
      if (requestId === requestIdRef.current) dispatch({ type: 'loaded', result });
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      // 仅记录异常类型和失败位置，不把文件正文、原始错误消息写入日志。
      console.error('PDF 导入失败', {
        name: getPdfErrorName(error),
        stage: error instanceof PdfReadError ? error.stage : 'document',
        page: error instanceof PdfReadError ? error.page : 0,
      });
      dispatch({ type: 'failed', error: getPdfErrorMessage(error), clearDocument: true });
    }
  };

  return {
    ...state, editedCount, pages, handleFile,
    updateBlock: (id: string, content: string) => dispatch({ type: 'content', id, content }),
    updateBlockLink: (blockId: string, linkId: string, url: string) =>
      dispatch({ type: 'link', blockId, linkId, url }),
    toggleBlock: (id: string) => dispatch({ type: 'toggle', id }),
    expandAll: () => dispatch({ type: 'expand' }),
    collapseAll: () => dispatch({ type: 'collapse' }),
    setRawText: (value: string) => dispatch({ type: 'rawText', value }),
  };
};
