import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

const addPageLinks = (pdf: jsPDF, pageElement: HTMLElement, pageSize: ReturnType<typeof createPdfPageSize>) => {
  const pageRect = pageElement.getBoundingClientRect();
  const scaleX = pageSize.width / pageRect.width;
  const scaleY = pageSize.height / pageRect.height;
  const linkElements = Array.from(
    pageElement.querySelectorAll<HTMLElement>('.link-export-target'),
  );

  linkElements.forEach((linkElement) => {
    const url = linkElement.dataset.linkUrl;
    if (!url) {
      return;
    }

    const linkRect = linkElement.getBoundingClientRect();
    pdf.link(
      (linkRect.left - pageRect.left) * scaleX,
      (linkRect.top - pageRect.top) * scaleY,
      linkRect.width * scaleX,
      linkRect.height * scaleY,
      { url },
    );
  });
};

/** Capture rendered pages and restore the editor even when rendering fails. */
export const exportPdfPages = async (pageElements: HTMLElement[], fileName: string) => {
  if (pageElements.length === 0) return;

  document.body.classList.add('is-exporting');
  try {
    await document.fonts.ready;
    let pdf: jsPDF | null = null;

    for (const pageElement of pageElements) {
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
      addPageLinks(pdf, pageElement, pageSize);
    }

    pdf?.save(createExportFileName(fileName));
  } finally {
    document.body.classList.remove('is-exporting');
  }
};
