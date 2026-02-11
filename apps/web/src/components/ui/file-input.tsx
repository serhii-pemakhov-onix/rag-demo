import * as React from 'react';
import { cn } from '@/lib/utils';

interface FileInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  onFileChange?: (file: File | null) => void;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, onFileChange, onChange, multiple, ...props }, ref) => {
    const [displayText, setDisplayText] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!, []);

    const handleClick = () => {
      inputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (multiple && files && files.length > 1) {
        setDisplayText(`${files.length} files selected`);
      } else {
        const file = files?.[0] || null;
        setDisplayText(file?.name || null);
      }
      onFileChange?.(files?.[0] || null);
      onChange?.(e);
    };

    // Reset displayText when input is cleared programmatically
    React.useEffect(() => {
      const input = inputRef.current;
      if (input && !input.value) {
        setDisplayText(null);
      }
    });

    const placeholder = multiple ? 'Click to choose files' : 'Click to choose file';
    const replaceText = multiple ? 'Click to replace files.' : 'Click to replace file.';

    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex min-h-9 w-full cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 font-normal text-sm shadow-xs ring-offset-background transition-colors',
          'hover:bg-accent/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleChange}
          multiple={multiple}
          className="sr-only"
          {...props}
        />
        <span className="text-muted-foreground">
          {displayText ? (
            <>
              {replaceText} <span className="text-foreground">Chosen: {displayText}</span>
            </>
          ) : (
            placeholder
          )}
        </span>
      </button>
    );
  },
);
FileInput.displayName = 'FileInput';

export { FileInput };
