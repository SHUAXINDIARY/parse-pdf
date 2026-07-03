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

## 注意事项

- 当前所有解析和导出逻辑都在浏览器本地执行。
- PDF 本身如果是扫描图片，没有可复制文本层，则无法直接解析出可编辑文字。
- 部分 PDF 的字体、坐标或 annotation 结构不标准时，语义分块和链接匹配可能需要针对样本继续优化。
