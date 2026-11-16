import { readPdfLines } from '../../../services/pdf/readPdfLines';
import type { ParsedPdf } from '../types';
import { parseSemanticBlocks, stringifyBlocks } from './blocks';

export const extractPdfBlocks = async (file: File): Promise<ParsedPdf> => {
  const { lines, pageCount } = await readPdfLines(file);
  const blocks = parseSemanticBlocks(lines);
  return { blocks, pageCount, rawText: stringifyBlocks(blocks) };
};
