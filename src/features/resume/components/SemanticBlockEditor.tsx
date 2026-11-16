import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ResumeBlock } from '../types';
import { getBlockIndentLevel } from '../utils/blocks';
import { ExportLinks, LinkEditor } from './ResumeLinks';

type SemanticBlockEditorProps = {
  block: ResumeBlock;
  onChange: (id: string, content: string) => void;
  onLinkChange: (blockId: string, linkId: string, url: string) => void;
  onToggle: (id: string) => void;
};

export const SemanticBlockEditor = ({
  block, onChange, onLinkChange, onToggle,
}: SemanticBlockEditorProps) => (
  <section className={`semantic-block semantic-block--${block.type} indent-${getBlockIndentLevel(block)}`}>
    {block.type === 'section' ? (
      <input
        className="section-title-input"
        value={block.content}
        onChange={(event) => onChange(block.id, event.target.value)}
      />
    ) : (
      <>
        <button
          className="semantic-trigger"
          onClick={() => onToggle(block.id)}
          aria-expanded={block.isOpen}
        >
          {block.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>{block.title}</span>
        </button>
        {block.isOpen ? (
          <>
            <textarea
              className="semantic-editor"
              value={block.content}
              onChange={(event) => onChange(block.id, event.target.value)}
              rows={Math.min(12, Math.max(2, block.content.split('\n').length + 1))}
            />
            <LinkEditor
              links={block.links}
              onChange={(linkId, url) => onLinkChange(block.id, linkId, url)}
            />
          </>
        ) : null}
      </>
    )}
    <div className={`export-text${block.type === 'section' ? ' export-text--section' : ''}`}>
      {block.content}
    </div>
    <ExportLinks links={block.links} />
  </section>
);
