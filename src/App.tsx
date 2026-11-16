import { FileText, LoaderCircle, Upload } from 'lucide-react';
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
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Resume PDF Parser</p>
            <h1>PDF 内容解析与实时编辑</h1>
          </div>
          <FileUploadButton
            className="primary-action"
            accept="application/pdf,.pdf"
            onFile={editor.handleFile}
          >
            <Upload size={18} />上传 PDF
          </FileUploadButton>
        </header>

        <section className="summary-grid" aria-label="解析状态">
          <MetricCard label="文件" value={editor.fileName || '未上传'} />
          <MetricCard label="页数" value={editor.pageCount || '-'} />
          <MetricCard label="语义块" value={editor.blocks.length || '-'} />
          <MetricCard label="已修改块" value={editor.editedCount || '-'} />
        </section>

        {editor.parseState === 'idle' ? (
          <FileDropZone onFile={editor.handleFile}>
            <FileText size={42} />
            <h2>拖入 PDF 或点击上传</h2>
            <p>解析结果会按语义块组织，并尽量保留 PDF 原始层级和缩进。</p>
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
