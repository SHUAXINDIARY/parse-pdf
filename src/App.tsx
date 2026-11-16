import { FileText, LoaderCircle, LockKeyhole, Upload } from 'lucide-react';
import { FileDropZone } from './components/FileDropZone';
import { FileUploadButton } from './components/FileUploadButton';
import { MetricCard } from './components/MetricCard';
import { StatusPanel } from './components/StatusPanel';
import { ResumePreview } from './features/resume/components/ResumePreview';
import { StructuredTextPanel } from './features/resume/components/StructuredTextPanel';
import { usePdfExport } from './features/resume/hooks/usePdfExport';
import { useResumeEditor } from './features/resume/hooks/useResumeEditor';
import './App.css';

const App = () => {
  const editor = useResumeEditor();
  const { pagesRef, exportState, exportError, exportPdf } = usePdfExport(editor.fileName);

  return (
    <main className="app-shell">
      <section className={`workspace${editor.blocks.length > 0 ? ' workspace--has-document' : ''}`}>
        <header className="topbar">
          <div className="brand">
            <span className="brand-icon" aria-hidden="true"><FileText size={22} /></span>
            <div>
              <h1>PDF 内容解析与实时编辑</h1>
              <p className="brand-description">解析、编辑，整理每一页内容。</p>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="local-note"><LockKeyhole size={14} aria-hidden="true" />文件仅在本地处理</span>
            <FileUploadButton
              className="primary-action"
              accept="application/pdf,.pdf"
              onFile={editor.handleFile}
            >
              <Upload size={18} aria-hidden="true" />上传 PDF
            </FileUploadButton>
          </div>
        </header>

        <section className="summary-grid" aria-label="解析状态">
          <MetricCard label="文件" value={editor.fileName || '未上传'} />
          <MetricCard label="页数" value={editor.pageCount || '-'} />
          <MetricCard label="语义块" value={editor.blocks.length || '-'} />
          <MetricCard label="已修改块" value={editor.editedCount || '-'} />
        </section>

        {editor.parseState === 'idle' ? (
          <FileDropZone onFile={editor.handleFile}>
            <span className="upload-icon" aria-hidden="true"><FileText size={32} strokeWidth={1.5} /></span>
            <h2>拖入 PDF 或点击上传</h2>
            <p>解析结果会按语义块组织，并尽量保留 PDF 原始层级和缩进。</p>
            <FileUploadButton className="primary-action" accept="application/pdf,.pdf" onFile={editor.handleFile}>
              <Upload size={16} aria-hidden="true" />选择 PDF 文件
            </FileUploadButton>
            <span className="upload-hint">支持 PDF 格式 · 在浏览器本地解析</span>
          </FileDropZone>
        ) : null}
        {editor.parseState === 'reading' ? (
          <StatusPanel icon={<LoaderCircle className="spin" size={24} />}>
            正在解析 PDF 内容...
          </StatusPanel>
        ) : null}
        {editor.parseState === 'error' ? (
          <StatusPanel icon={<FileText size={24} />} error>{editor.error}</StatusPanel>
        ) : null}

        {editor.blocks.length > 0 ? (
          <section className="editor-layout">
            <ResumePreview
              pages={editor.pages}
              pagesRef={pagesRef}
              exportState={exportState}
              exportError={exportError}
              onExport={exportPdf}
              onExpandAll={editor.expandAll}
              onCollapseAll={editor.collapseAll}
              onBlockChange={editor.updateBlock}
              onLinkChange={editor.updateBlockLink}
              onToggleBlock={editor.toggleBlock}
            />
            <StructuredTextPanel value={editor.rawText} onChange={editor.setRawText} />
          </section>
        ) : null}
      </section>
    </main>
  );
};

export default App;
