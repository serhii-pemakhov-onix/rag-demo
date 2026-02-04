import * as React from 'react';
import { cn } from '@/lib/utils';

interface FileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  onFileChange?: (file: File | null) => void;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, onFileChange, onChange, ...props }, ref) => {
    const [fileName, setFileName] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!, []);

    const handleClick = () => {
      inputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      setFileName(file?.name || null);
      onFileChange?.(file);
      onChange?.(e);
    };

    // Reset fileName when input is cleared programmatically
    React.useEffect(() => {
      const input = inputRef.current;
      if (input && !input.value) {
        setFileName(null);
      }
    });

    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'border-input bg-background ring-offset-background flex min-h-9 w-full cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-normal shadow-xs transition-colors',
          'hover:bg-accent/50',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          className,
        )}
      >
        <input type="file" ref={inputRef} onChange={handleChange} className="sr-only" {...props} />
        <span className="text-muted-foreground">
          {fileName ? (
            <>
              Click to replace file. <span className="text-foreground">Chosen: {fileName}</span>
            </>
          ) : (
            'Click to choose file'
          )}
        </span>
      </button>
    );
  },
);
FileInput.displayName = 'FileInput';

export { FileInput };
