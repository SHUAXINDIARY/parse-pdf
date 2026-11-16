import type { ResumeLink } from '../types';

/** 链接编辑区的数据与修改回调。 */
type LinkEditorProps = {
  /** 当前语义块解析出的链接。 */
  links: ResumeLink[];
  /** 修改指定链接的目标地址。 */
  onChange: (linkId: string, url: string) => void;
};

export const LinkEditor = ({ links, onChange }: LinkEditorProps) => links.length > 0 ? (
  <div className="link-editor-list">
    {links.map((link) => (
      <div className="link-editor-row" key={link.id}>
        <span>{link.label}</span>
        <input
          aria-label={`链接地址：${link.label}`}
          value={link.url}
          onChange={(event) => onChange(link.id, event.target.value)}
        />
        <a href={link.url} target="_blank" rel="noreferrer">预览</a>
      </div>
    ))}
  </div>
) : null;

/** 导出目标始终挂载，确保收起编辑区后仍能恢复 PDF 可点击链接。 */
type ExportLinksProps = {
  /** 导出时显示并标注的链接。 */
  links: ResumeLink[];
};
export const ExportLinks = ({ links }: ExportLinksProps) => links.length > 0 ? (
  <div className="export-links">
    {links.map((link) => (
      <span className="link-export-target" data-link-url={link.url} key={link.id}>
        {link.url}
      </span>
    ))}
  </div>
) : null;
