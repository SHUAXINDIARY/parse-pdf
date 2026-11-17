import { useState } from 'react';
import { CodeXml } from 'lucide-react';
import { PanelHeading } from '../../../components/PanelHeading';
import type { MarkdownDraft } from '../types';

/** Markdown 源码编辑区，逐页保存且不覆盖普通文本草稿。 */
type MarkdownEditorPanelProps = {
  /** 当前文件全部页面的 Markdown。 */
  drafts: MarkdownDraft[];
  /** 导出期间锁定内容。 */
  disabled: boolean;
  /** 当前是否自动重排。 */
  reflow: boolean;
  /** 修改指定页面源码。 */
  onChange: (page: number, source: string) => void;
  /** 切换定位方式，不改写源码。 */
  onReflowChange: (value: boolean) => void;
};

export const MarkdownEditorPanel = ({ drafts, disabled, reflow, onChange, onReflowChange }: MarkdownEditorPanelProps) => {
  const [selectedPage, setSelectedPage] = useState(1);
  const draft = drafts.find((item) => item.page === selectedPage) ?? drafts[0];
  return (
    <aside className="raw-panel markdown-editor">
      <PanelHeading title="Markdown 源码" description="独立草稿 · 修改后实时更新左侧页面" compact>
        <CodeXml size={18} aria-hidden="true" />
      </PanelHeading>
      <div className="markdown-editor-options">
        <label>编辑页面
          <select value={draft?.page ?? ''} disabled={disabled || !draft} onChange={(event) => setSelectedPage(Number(event.target.value))}>
            {drafts.map((item) => <option key={item.page} value={item.page}>第 {item.page} 页</option>)}
          </select>
        </label>
        <label>文字排版
          <select value={reflow ? 'reflow' : 'positioned'} disabled={disabled} onChange={(event) => onReflowChange(event.target.value === 'reflow')}>
            <option value="positioned">原位还原</option>
            <option value="reflow">自动重排</option>
          </select>
        </label>
      </div>
      <p className="markdown-editor-note" id="markdown-editing-note">
        {reflow ? '文字按源码顺序重排，隐藏原页装饰底图；新增图片仍会显示。' : '保留原页位置。增加文字可能与后文重叠，可调整位置或选择自动重排。'}
      </p>
      <textarea aria-label={`第 ${draft?.page ?? 1} 页 Markdown 源码`} aria-describedby="markdown-editing-note"
        className="raw-textarea" spellCheck={false} disabled={disabled || !draft} value={draft?.source ?? ''}
        onChange={(event) => { if (draft) onChange(draft.page, event.target.value); }} />
      <details className="markdown-help">
        <summary>语法与格式说明</summary>
        <p><code># 标题</code>、<code>**粗体**</code>、<code>*斜体*</code>、列表、引用、代码块、表格均可使用。</p>
        <p>链接：<code>[文字](https://example.com)</code>；图片：<code>![说明](https://example.com/image.png)</code>。</p>
        <p>保留空行以解析 HTML 容器内的 Markdown；换行可使用行末两个空格或 <code>&lt;br /&gt;</code>。</p>
        <p>在最末尾的 <code>&lt;/div&gt;</code> 之后添加段落，可接在原页内容下方继续排版。</p>
        <p>可修改 style 中的 font-size、color、font-family、line-height、left、top、width。cqw 表示纸张宽度的百分之一，也支持 px。</p>
        <p>图片与装饰合并保留在原页底图中；复杂背景与缺失字体可能存在还原差异。此处修改仅保存到 Markdown 草稿。</p>
      </details>
    </aside>
  );
};
