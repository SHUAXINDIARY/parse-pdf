import { useRef, useState } from 'react';
import { exportPdfPages } from '../../../services/pdf/exportPdfPages';
import type { ExportState } from '../types';

export const usePdfExport = (fileName: string) => {
  const pagesRef = useRef<HTMLDivElement>(null);
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [exportError, setExportError] = useState('');

  const exportPdf = async () => {
    const pageElements = Array.from(
      pagesRef.current?.querySelectorAll<HTMLElement>('.resume-page') ?? [],
    );
    if (pageElements.length === 0) return;
    if (pageElements.some((page) => page.querySelector('[data-export-error="image"]'))) {
      setExportState('error');
      setExportError('部分图片无法加载，请修改或删除对应图片地址后再导出。外部图片需允许跨域访问。');
      return;
    }

    setExportState('exporting');
    setExportError('');
    try {
      await exportPdfPages(pageElements, fileName);
      setExportState('idle');
    } catch {
      setExportState('error');
      setExportError('PDF 导出失败，请稍后重试。');
    }
  };

  return { pagesRef, exportState, exportError, exportPdf };
};
