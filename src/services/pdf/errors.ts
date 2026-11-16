/** PDF 导入失败时所处的处理阶段。 */
export type PdfReadStage = 'document' | 'page' | 'text' | 'render' | 'appearance';

/** 保存失败页码和原始异常，避免将版式错误一概提示为文件损坏。 */
export class PdfReadError extends Error {
  /** 失败的处理阶段。 */
  readonly stage: PdfReadStage;
  /** 从 1 开始的页码，0 表示尚未打开文档。 */
  readonly page: number;
  /** 保留原始异常供调用者分析，不向界面输出其任意文本。 */
  readonly cause: unknown;

  constructor(stage: PdfReadStage, page: number, cause: unknown) {
    super('PDF 读取失败');
    this.name = 'PdfReadError';
    this.stage = stage;
    this.page = page;
    this.cause = cause;
  }
}

/** 仅提取异常名称；不输出可能包含 PDF 正文或链接的原始异常消息。 */
export const getPdfErrorName = (error: unknown): string => {
  const cause = error instanceof PdfReadError ? error.cause : error;
  if (typeof cause === 'object' && cause !== null && 'name' in cause && typeof cause.name === 'string') {
    return cause.name;
  }
  return 'UnknownError';
};

/** 将文档加密、格式错误和某页处理失败区分为可理解的提示。 */
export const getPdfErrorMessage = (error: unknown): string => {
  const name = getPdfErrorName(error);
  if (name === 'PasswordException') return '此 PDF 需要密码，请先解锁后重新上传。';
  if (name === 'InvalidPDFException') return 'PDF 格式无效或文件不完整，请重新下载或导出后上传。';
  if (error instanceof PdfReadError && error.page > 0) {
    const action = { document: '读取', page: '读取', text: '内容解析', render: '预览生成', appearance: '版式处理' }[error.stage];
    return `PDF 第 ${error.page} 页${action}失败，请尝试重新导出原文件后上传。`;
  }
  return 'PDF 读取失败，请重新选择文件；若仍失败，可尝试重新导出原文件后上传。';
};
