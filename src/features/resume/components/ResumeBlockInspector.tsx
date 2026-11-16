import { X } from 'lucide-react';
import type { ResumeBlock } from '../types';
import { LinkEditor } from './ResumeLinks';

/** 与纸张分离的编辑面板，不参与 PDF 导出。 */
type ResumeBlockInspectorProps = {
  /** 当前选中的语义块。 */
  block: ResumeBlock;
  /** 导出时锁定编辑。 */
  disabled: boolean;
  /** 更新正文。 */
  onChange: (id: string, content: string) => void;
  /** 更新链接。 */
  onLinkChange: (blockId: string, linkId: string, url: string) => void;
  /** 关闭面板。 */
  onClose: () => void;
};

export const ResumeBlockInspector = ({ block, disabled, onChange, onLinkChange, onClose }: ResumeBlockInspectorProps) => (
  <section className="block-inspector" aria-label="编辑选中内容">
    <div className="block-inspector-heading">
      <strong>编辑内容 <span>第 {block.page} 页 · {block.section}</span></strong>
      <button type="button" onClick={onClose} aria-label="关闭内容编辑"><X size={16} /></button>
    </div>
    <fieldset disabled={disabled}>
      <textarea
        aria-label="选中内容正文"
        value={block.content}
        rows={3}
        onChange={(event) => onChange(block.id, event.target.value)}
      />
      <LinkEditor links={block.links} onChange={(linkId, url) => onLinkChange(block.id, linkId, url)} />
    </fieldset>
  </section>
);
