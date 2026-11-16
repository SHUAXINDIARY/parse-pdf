import type { Ref } from 'react';
import { ChevronDown, ChevronRight, Download, LoaderCircle } from 'lucide-react';
import { PanelHeading } from '../../../components/PanelHeading';
import type { ExportState, ResumePage } from '../types';
import { SemanticBlockEditor } from './SemanticBlockEditor';

type ResumePreviewProps = {
  pages: ResumePage[];
  pagesRef: Ref<HTMLDivElement>;
  exportState: ExportState;
  exportError: string;
  onExport: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onBlockChange: (id: string, content: string) => void;
  onLinkChange: (blockId: string, linkId: string, url: string) => void;
  onToggleBlock: (id: string) => void;
};

export const ResumePreview = ({
  pages, pagesRef, exportState, exportError, onExport, onExpandAll,
  onCollapseAll, onBlockChange, onLinkChange, onToggleBlock,
}: ResumePreviewProps) => (
  <div className="items-panel">
    <PanelHeading title="PDF 版式预览" description="按语义块展开编辑，缩进和章节层级会贴近原 PDF。">
      <div className="toolbar">
        <button className="export-action" disabled={exportState === 'exporting'} onClick={onExport}>
          {exportState === 'exporting'
            ? <LoaderCircle className="spin" size={16} />
            : <Download size={16} />}
          {exportState === 'exporting' ? '导出中' : '导出 PDF'}
        </button>
        <button onClick={onExpandAll}><ChevronDown size={16} />全部展开</button>
        <button onClick={onCollapseAll}><ChevronRight size={16} />全部收起</button>
      </div>
    </PanelHeading>
    {exportState === 'error' ? <div className="inline-error">{exportError}</div> : null}
    <div className="resume-pages" ref={pagesRef}>
      {pages.map(({ page, blocks }) => (
        <article className="resume-page" key={page}>
          <div className="page-marker">第 {page} 页</div>
          {blocks.map((block) => (
            <SemanticBlockEditor
              key={block.id}
              block={block}
              onChange={onBlockChange}
              onLinkChange={onLinkChange}
              onToggle={onToggleBlock}
            />
          ))}
        </article>
      ))}
    </div>
  </div>
);
