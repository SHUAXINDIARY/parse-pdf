import { useCallback, useState } from 'react';
import type { Ref } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { PanelHeading } from '../../../components/PanelHeading';
import type { ExportState, ResumeLayout, ResumePage } from '../types';
import { OriginalPagePreview } from './OriginalPagePreview';
import { ResumeBlockInspector } from './ResumeBlockInspector';
import { ResumeLayoutPicker } from './ResumeLayoutPicker';

/** 页面排版、编辑选区与导出入口。 */
type ResumePreviewProps = {
  /** 页面和当前编辑内容。 */
  pages: ResumePage[];
  /** 导出服务读取的页面容器。 */
  pagesRef: Ref<HTMLDivElement>;
  /** 导出状态。 */
  exportState: ExportState;
  /** 导出错误。 */
  exportError: string;
  /** 导出当前布局。 */
  onExport: () => void;
  /** 更新选中块正文。 */
  onBlockChange: (id: string, content: string) => void;
  /** 更新选中块链接。 */
  onLinkChange: (blockId: string, linkId: string, url: string) => void;
};

export const ResumePreview = ({
  pages, pagesRef, exportState, exportError, onExport, onBlockChange, onLinkChange,
}: ResumePreviewProps) => {
  const [layout, setLayout] = useState<ResumeLayout>('original');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overflowIds, setOverflowIds] = useState<Set<string>>(() => new Set());
  const blocks = pages.flatMap((page) => page.blocks);
  const selectedBlock = blocks.find((block) => block.id === selectedId);
  const exporting = exportState === 'exporting';
  const overflow = layout === 'original' && blocks.some((block) =>
    block.content !== block.originalContent && Array.from(overflowIds).some((id) => id === block.id || id.startsWith(`${block.id}::`)),
  );
  const onOverflow = useCallback((id: string, overflowing: boolean) => {
    setOverflowIds((current) => {
      if (current.has(id) === overflowing) return current;
      const next = new Set(current);
      if (overflowing) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return (
    <div className="items-panel">
      <PanelHeading title="PDF 版式预览" description="点击页面内容编辑，导出使用当前排版样式。">
        <div className="toolbar">
          <button className="export-action" disabled={exporting || overflow} onClick={onExport}>
            {exporting ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}
            {exporting ? '导出中' : '导出 PDF'}
          </button>
        </div>
      </PanelHeading>
      <div className="layout-options">
        <ResumeLayoutPicker value={layout} disabled={exporting} onChange={setLayout} />
      </div>
      {exportState === 'error' ? <div className="inline-error" role="alert">{exportError}</div> : null}
      {overflow ? (
        <div className="inline-error" role="alert">修改内容超出原版区域，请精简内容或切换到重排样式后导出。</div>
      ) : null}
      {selectedBlock ? (
        <ResumeBlockInspector
          block={selectedBlock} disabled={exporting} onChange={onBlockChange}
          onLinkChange={onLinkChange} onClose={() => setSelectedId(null)}
        />
      ) : null}
      <div className={`resume-pages resume-pages--${layout}`} ref={pagesRef}>
        {pages.map((page) => (
          <div className="resume-page-group" key={page.page}>
            <div className="preview-page-label">第 {page.page} 页</div>
            {layout === 'original' || page.blocks.length === 0 ? (
              <OriginalPagePreview page={page} selectedId={selectedId} disabled={exporting} onSelect={setSelectedId} onOverflow={onOverflow} />
            ) : (
              <article
                className={`resume-page resume-page--reflow resume-page--${layout}`}
                data-page-width={page.width}
                aria-label={`第 ${page.page} 页`}
              >
                <div className="reflow-page-content" style={{ minHeight: `${page.height / page.width * 100}cqw` }}>
                  {page.blocks.map((block) => (
                    <section className={`layout-block layout-block--${block.type}`} key={block.id}>
                      <button
                        type="button" className={`layout-content${selectedId === block.id ? ' is-selected' : ''}`}
                        onClick={() => setSelectedId(block.id)} disabled={exporting}
                        aria-label={`编辑：${block.title}`} aria-pressed={selectedId === block.id}
                      >{block.content}</button>
                      {block.links.length > 0 ? (
                        <div className="layout-links">
                          {block.links.map((link) => (
                            <a className="link-export-target" data-link-url={link.url} href={link.url} target="_blank" rel="noreferrer" key={link.id}>{link.url}</a>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  ))}
                  <div className="layout-links">
                    {page.links.filter((link) => !page.blocks.some((block) => block.links.some((item) => item.id === link.id))).map((link) => (
                      <a className="link-export-target" data-link-url={link.url} href={link.url} target="_blank" rel="noreferrer" key={link.id}>{link.url}</a>
                    ))}
                  </div>
                </div>
              </article>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
