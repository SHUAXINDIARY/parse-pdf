import type { ResumeLayout } from '../types';

/** 各预设的名称和面向用户的排版说明。 */
export const RESUME_LAYOUTS: { id: ResumeLayout; label: string; description: string }[] = [
  { id: 'original', label: '原版还原', description: '保留原始页面、字体、图片及文字位置；点击文字区域编辑。' },
  { id: 'classic', label: '经典简历', description: '按文字内容重排，使用清晰的章节分隔与均衡留白。' },
  { id: 'compact', label: '紧凑高效', description: '缩小段落间距和页边距，适合信息较多的内容。' },
  { id: 'editorial', label: '舒朗阅读', description: '放大章节标题，增加行距和留白，适合阅读与审阅。' },
];

/** 排版选择器的值及事件。 */
type ResumeLayoutPickerProps = {
  /** 当前版式。 */
  value: ResumeLayout;
  /** 导出期间锁定版式。 */
  disabled: boolean;
  /** 切换仅改变排版，保留全部内容编辑。 */
  onChange: (layout: ResumeLayout) => void;
};

export const ResumeLayoutPicker = ({ value, disabled, onChange }: ResumeLayoutPickerProps) => (
  <div className="layout-picker" role="group" aria-label="排版样式">
    <span className="layout-picker-label">排版样式</span>
    {RESUME_LAYOUTS.map((layout) => (
      <button
        key={layout.id}
        type="button"
        aria-pressed={layout.id === value}
        title={layout.description}
        disabled={disabled}
        onClick={() => onChange(layout.id)}
      >
        {layout.label}
      </button>
    ))}
    <span className="layout-picker-note" aria-live="polite">
      {RESUME_LAYOUTS.find((layout) => layout.id === value)?.description}
    </span>
  </div>
);
