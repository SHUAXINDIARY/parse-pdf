import { useMemo, useReducer } from 'react';
import { extractPdfBlocks } from '../utils/extractPdfBlocks';
import type { ParsedPdf, ParseState, ResumeBlock } from '../types';
import { createTitle, stringifyBlocks } from '../utils/blocks';

type EditorState = {
  fileName: string;
  blocks: ResumeBlock[];
  rawText: string;
  pageCount: number;
  parseState: ParseState;
  error: string;
};

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
        ...(action.clearDocument ? { blocks: [], rawText: '', pageCount: 0 } : {}),
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
      const blocks = state.blocks.map((block) =>
        block.id === action.blockId
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
  const editedCount = useMemo(() => state.blocks.filter(
    (block) => block.content.trim() !== block.originalContent.trim(),
  ).length, [state.blocks]);
  const pages = useMemo(() => Array.from({ length: state.pageCount }, (_, index) => ({
    page: index + 1,
    blocks: state.blocks.filter((block) => block.page === index + 1),
  })), [state.blocks, state.pageCount]);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      dispatch({ type: 'failed', error: '请选择 PDF 文件。', clearDocument: false });
      return;
    }
    dispatch({ type: 'reading', fileName: file.name });
    try {
      dispatch({ type: 'loaded', result: await extractPdfBlocks(file) });
    } catch {
      dispatch({ type: 'failed', error: 'PDF 解析失败，请确认文件没有加密或损坏。', clearDocument: true });
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
