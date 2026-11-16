import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { codeInspectorPlugin } from 'code-inspector-plugin';


// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: 'PDF 解析与编辑 · 实时预览与多样排版 | PDF Editor',
    meta: {
      description:
        '在浏览器本地解析 PDF，编辑文字与链接并实时预览。支持原版还原与多种排版样式，可将修改后的内容导出为 PDF。',
      keywords: 'PDF 解析,PDF 编辑,实时预览,原版还原,PDF 排版,文本编辑,链接编辑,PDF 导出',
      'application-name': 'PDF Editor',
    },
  },
  tools: {
    rspack: {
      plugins: [
        codeInspectorPlugin({
          bundler: 'rspack',
        })
      ]
    }
  },
});
