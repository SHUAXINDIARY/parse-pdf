import type { ReactNode } from 'react';

type StatusPanelProps = {
  icon: ReactNode;
  children: ReactNode;
  error?: boolean;
};

export const StatusPanel = ({ icon, children, error = false }: StatusPanelProps) => (
  <section className={`status-panel${error ? ' error-panel' : ''}`}>
    {icon}
    <span>{children}</span>
  </section>
);
