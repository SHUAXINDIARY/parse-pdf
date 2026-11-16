import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const createExportFileName = (name: string) => {
  const baseName = name.replace(/\.pdf$/i, '').trim() || 'resume';
  return `${baseName}-edited.pdf`;
};

/** PDF.js 的 1 倍视口使用 1/72 英寸，避免把所有原稿强制改为 A4 宽度。 */
const createPdfPageSize = (canvas: HTMLCanvasElement, pageElement: HTMLElement) => {
  const sourceWidth = Number(pageElement.dataset.pageWidth);
  const width = Number.isFinite(sourceWidth) && sourceWidth > 0 ? sourceWidth * 25.4 / 72 : 210;
  return { width, height: canvas.height * width / canvas.width };
};

const addPageLinks = (pdf: jsPDF, pageElement: HTMLElement, pageSize: ReturnType<typeof createPdfPageSize>) => {
  const pageRect = pageElement.getBoundingClientRect();
  const scaleX = pageSize.width / pageRect.width;
  const scaleY = pageSize.height / pageRect.height;
  const linkElements = Array.from(pageElement.querySelectorAll<HTMLElement>('.link-export-target'));

  linkElements.forEach((linkElement) => {
    const url = linkElement.dataset.linkUrl;
    if (!url) return;
    const linkRect = linkElement.getBoundingClientRect();
    if (linkRect.width === 0 || linkRect.height === 0) return;
    pdf.link(
      (linkRect.left - pageRect.left) * scaleX,
      (linkRect.top - pageRect.top) * scaleY,
      linkRect.width * scaleX,
      linkRect.height * scaleY,
      { url },
    );
  });
};

/** 捕获当前排版，保留各页尺寸、横竖方向和链接，失败也恢复编辑界面。 */
export const exportPdfPages = async (pageElements: HTMLElement[], fileName: string) => {
  if (pageElements.length === 0) return;
  document.body.classList.add('is-exporting');
  try {
    await document.fonts.ready;
    // 初次导入就导出时也等待原版图像解码，防止得到空白纸张。
    await Promise.all(pageElements.flatMap((page) =>
      Array.from(page.querySelectorAll('img')).map((image) => image.decode()),
    ));
    let pdf: jsPDF | null = null;
    for (const pageElement of pageElements) {
      const canvas = await html2canvas(pageElement, {
        backgroundColor: '#ffffff',
        scale: Math.min(window.devicePixelRatio || 1, 2),
        useCORS: true,
      });
      try {
        const pageSize = createPdfPageSize(canvas, pageElement);
        const orientation = pageSize.width > pageSize.height ? 'landscape' : 'portrait';
        if (pdf) pdf.addPage([pageSize.width, pageSize.height], orientation);
        else pdf = new jsPDF({ orientation, unit: 'mm', format: [pageSize.width, pageSize.height] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageSize.width, pageSize.height);
        addPageLinks(pdf, pageElement, pageSize);
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
    pdf?.save(createExportFileName(fileName));
  } finally {
    document.body.classList.remove('is-exporting');
  }
};
