import type { CSSProperties } from 'react';
import type { PdfRect, PdfSourcePage } from '../../../services/pdf/types';
import type { ResumeBlock } from '../types';

/** 合并来源行范围；不再用固定缩进级别重建原版位置。 */
export const getBlockBounds = (block: ResumeBlock): PdfRect => {
  const lines = block.sourceLines;
  if (lines.length === 0) return { left: 0, top: 0, width: 0, height: 0 };
  const left = Math.min(...lines.map((line) => line.bounds.left));
  const top = Math.min(...lines.map((line) => line.bounds.top));
  return {
    left, top,
    width: Math.max(...lines.map((line) => line.bounds.left + line.bounds.width)) - left,
    height: Math.max(...lines.map((line) => line.bounds.top + line.bounds.height)) - top,
  };
};

/** 坐标使用百分比，纸张随 PC 面板宽度缩放时仍与背景图像对齐。 */
export const rectStyle = (rect: PdfRect, page: Pick<PdfSourcePage, 'width' | 'height'>): CSSProperties => ({
  left: `${rect.left / page.width * 100}%`,
  top: `${rect.top / page.height * 100}%`,
  width: `${rect.width / page.width * 100}%`,
  height: `${rect.height / page.height * 100}%`,
});
