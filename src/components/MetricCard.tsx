import type { ReactNode } from 'react';

type MetricCardProps = { label: string; value: ReactNode };

export const MetricCard = ({ label, value }: MetricCardProps) => (
  <div className="metric-panel">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);
