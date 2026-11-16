import { useRef } from 'react';
import type { ReactNode } from 'react';

type FileUploadButtonProps = {
  accept?: string;
  children: ReactNode;
  className?: string;
  onFile: (file: File) => void;
};

export const FileUploadButton = ({ accept, children, className, onFile }: FileUploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button className={className} onClick={() => inputRef.current?.click()}>
        {children}
      </button>
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </>
  );
};
