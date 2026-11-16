import type { ReactNode } from 'react';

/** 文档信息条中的单项指标。 */
type MetricCardProps = {
  /** 指标名称。 */
  label: string;
  /** 指标值，长字符串通过提示展示完整内容。 */
  value: ReactNode;
};

export const MetricCard = ({ label, value }: MetricCardProps) => (
  <div className="metric-panel">
    <span>{label}</span>
    <strong title={typeof value === 'string' ? value : undefined}>{value}</strong>
  </div>
);
