# Resume PDF Editor

一个基于 Rsbuild、React 和 TypeScript 的 PDF 简历解析编辑工具。

应用支持上传 PDF 简历，在浏览器本地解析文本内容和链接信息，将内容按语义块组织成接近原 PDF 层级的可编辑视图，并支持将编辑后的结果重新导出为 PDF。

## 功能

- 上传或拖拽 PDF 文件
- 使用 PDF.js 在浏览器端解析 PDF 文本
- 根据文本坐标重建行内容，减少中文被拆成单字换行的问题
- 按语义块组织简历内容，例如头部信息、教育经历、工作经历、个人项目、个人简介等
- 保留原 PDF 的页级展示、缩进层级和纸张预览效果
- 支持展开语义块并实时编辑文本
- 支持解析 PDF 原始超链接 annotation
- 支持预览和编辑解析出的链接 URL
- 导出编辑后的 PDF，并尽量保留可点击链接区域

## 技术栈

- Rsbuild
- React
- TypeScript
- pdfjs-dist
- html2canvas
- jsPDF
- lucide-react
- pnpm

## 本地开发

安装依赖：

```bash
pnpm install
```

启动开发服务：

```bash
pnpm run dev
```

生产构建：

```bash
pnpm run build
```

预览生产构建：

```bash
pnpm run preview
```

## 使用流程

1. 点击“上传 PDF”或将 PDF 拖入上传区域。
2. 等待浏览器完成解析。
3. 在“PDF 版式预览”中展开语义块并编辑内容。
4. 如果语义块包含原始 PDF 链接，可以在链接编辑区修改 URL 或点击预览。
5. 点击“导出 PDF”下载编辑后的 PDF。

## 实现说明

- PDF 文本解析基于 `page.getTextContent()`。
- PDF 链接解析基于 `page.getAnnotations()` 中的 `url`、`unsafeUrl` 和 `rect`。
- 文本行通过 PDF 文本片段的 `transform` 坐标进行聚合。
- 链接会根据 annotation 矩形和文本行位置匹配到对应语义块。
- PDF 导出通过 `html2canvas` 捕获页面预览，再用 `jsPDF` 生成文件。
- 导出时会根据 DOM 中的链接位置重新叠加 PDF link annotation。

## 代码结构

- `src/App.tsx`：页面入口，组合通用组件、业务组件和 hooks。
- `src/components/`：文件选择、拖拽上传、指标卡、面板标题和状态提示；通过 props 传入内容和事件，不依赖简历业务。
- `src/services/pdf/`：PDF 文本行与链接读取、DOM 页面导出及 PDF 几何类型，不依赖 React 或简历分块规则。
- `src/features/resume/types.ts`：简历语义块、解析结果和分页视图类型。
- `src/features/resume/utils/`：简历章节识别、语义分块、文本序列化及解析流程组合。
- `src/features/resume/hooks/`：编辑状态与操作、PDF 导出状态与预览容器引用。
- `src/features/resume/components/`：分页预览、语义块编辑、链接编辑和结构化文本面板。

其他 PDF 场景可以直接复用 `readPdfLines(file)` 获取坐标化文本行和链接，
再应用自己的分块规则。`exportPdfPages(pageElements, fileName)` 接收页面元素列表，
并根据 `.link-export-target` 元素的 `data-link-url` 恢复可点击链接；导出样式由 `App.css` 中的 `.is-exporting` 规则提供。

语义块内容和链接更新时，编辑状态会同时生成结构化文本。结构化文本支持独立编辑，
不反向修改语义块；展开、收起操作也不会覆盖独立编辑的文本。

## 注意事项

- 当前所有解析和导出逻辑都在浏览器本地执行。
- PDF 本身如果是扫描图片，没有可复制文本层，则无法直接解析出可编辑文字。
- 部分 PDF 的字体、坐标或 annotation 结构不标准时，语义分块和链接匹配可能需要针对样本继续优化。
