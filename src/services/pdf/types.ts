/** 页面坐标系中的矩形，单位为 PDF.js 的 1 倍视口像素。 */
export type PdfRect = {
  /** 左边界。 */
  left: number;
  /** 上边界。 */
  top: number;
  /** 矩形宽度。 */
  width: number;
  /** 矩形高度。 */
  height: number;
};

/** PDF 超链接及其原始、显示坐标。 */
export type PdfLink = {
  /** 文档内唯一标识。 */
  id: string;
  /** 目标地址。 */
  url: string;
  /** 对应文字。 */
  label: string;
  /** 从 1 开始的页码。 */
  page: number;
  /** PDF 原始坐标矩形。 */
  rect: [number, number, number, number];
  /** 已应用页面旋转的显示矩形。 */
  bounds: PdfRect;
};

/** 带原始版式的文字行。 */
export type PdfLine = {
  /** 行标识。 */
  id: string;
  /** 从 1 开始的页码。 */
  page: number;
  /** 合并后的文字。 */
  text: string;
  /** 用于语义分块的横向坐标。 */
  x: number;
  /** 从页面底部计量的纵向坐标。 */
  y: number;
  /** 字体高度。 */
  height: number;
  /** 显示坐标范围。 */
  bounds: PdfRect;
  /** 原始字体或浏览器回退字体。 */
  fontFamily: string;
  /** 修改文字时用于覆盖旧字的邻近底色。 */
  background: string;
  /** 从原字像素估计的前景色，避免深色底板上出现深色替换字。 */
  color: string;
  /** 关联链接。 */
  links: PdfLink[];
};

/** 可独立预览、导出的原始页面。 */
export type PdfSourcePage = {
  /** 页码。 */
  page: number;
  /** 原始页面宽度。 */
  width: number;
  /** 原始页面高度。 */
  height: number;
  /** 高分辨率页面图像，保留原始字形、颜色和图形。 */
  imageUrl: string;
  /** 去除可识别文字后的图片与装饰底图，供 Markdown 叠加可编辑文字。 */
  graphicsUrl: string;
  /** 包括未能匹配文字的所有页面链接。 */
  links: PdfLink[];
};
