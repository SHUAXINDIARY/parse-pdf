import type { ReactNode } from 'react';

type FileDropZoneProps = {
  children: ReactNode;
  onFile: (file: File) => void;
};

export const FileDropZone = ({ children, onFile }: FileDropZoneProps) => (
  <section
    className="upload-zone"
    onDragOver={(event) => event.preventDefault()}
    onDrop={(event) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) onFile(file);
    }}
  >
    {children}
  </section>
);
