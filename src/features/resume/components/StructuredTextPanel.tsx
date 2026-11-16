import { Save } from 'lucide-react';
import { PanelHeading } from '../../../components/PanelHeading';

type StructuredTextPanelProps = {
  value: string;
  onChange: (value: string) => void;
};

export const StructuredTextPanel = ({ value, onChange }: StructuredTextPanelProps) => (
  <aside className="raw-panel">
    <PanelHeading title="结构化文本" description="用于对照语义块解析结果。" compact>
      <Save size={18} />
    </PanelHeading>
    <textarea className="raw-textarea" value={value} onChange={(event) => onChange(event.target.value)} />
  </aside>
);
