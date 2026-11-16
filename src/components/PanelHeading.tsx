import type { ReactNode } from 'react';

type PanelHeadingProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  compact?: boolean;
};

export const PanelHeading = ({ title, description, children, compact = false }: PanelHeadingProps) => (
  <div className={`panel-heading${compact ? ' compact' : ''}`}>
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
    {children}
  </div>
);
