import { Save } from 'lucide-react';
import { PanelHeading } from '../../../components/PanelHeading';

/** 结构化文本面板的内容及编辑回调。 */
type StructuredTextPanelProps = {
  /** 当前结构化文本。 */
  value: string;
  /** 独立更新文本，不反向修改语义块。 */
  onChange: (value: string) => void;
};

export const StructuredTextPanel = ({ value, onChange }: StructuredTextPanelProps) => (
  <aside className="raw-panel">
    <PanelHeading title="结构化文本" description="用于对照语义块解析结果。" compact>
      <Save size={18} />
    </PanelHeading>
    <textarea aria-label="结构化文本" className="raw-textarea" value={value} onChange={(event) => onChange(event.target.value)} />
  </aside>
);
