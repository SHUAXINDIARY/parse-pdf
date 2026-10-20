import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: 'PDF 简历解析与编辑 | Resume PDF Editor',
    meta: {
      description:
        '在浏览器本地解析 PDF 简历，按语义块实时编辑文本与链接，预览页面内容并导出编辑后的 PDF。',
      keywords: 'PDF 简历,PDF 解析,PDF 编辑,简历编辑器,语义分块,PDF 导出',
      'application-name': 'Resume PDF Editor',
    },
  },
});
