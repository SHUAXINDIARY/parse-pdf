import type { ResumeLink } from '../types';

type LinkEditorProps = {
  links: ResumeLink[];
  onChange: (linkId: string, url: string) => void;
};

export const LinkEditor = ({ links, onChange }: LinkEditorProps) => links.length > 0 ? (
  <div className="link-editor-list">
    {links.map((link) => (
      <div className="link-editor-row" key={link.id}>
        <span>{link.label}</span>
        <input
          value={link.url}
          onChange={(event) => onChange(link.id, event.target.value)}
        />
        <a href={link.url} target="_blank" rel="noreferrer">预览</a>
      </div>
    ))}
  </div>
) : null;

// These targets stay mounted even when editors are collapsed, so export can
// capture their positions and restore clickable PDF annotations.
export const ExportLinks = ({ links }: { links: ResumeLink[] }) => links.length > 0 ? (
  <div className="export-links">
    {links.map((link) => (
      <span className="link-export-target" data-link-url={link.url} key={link.id}>
        {link.url}
      </span>
    ))}
  </div>
) : null;
