import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileUp } from 'lucide-react';
import { cn } from '../../../ui/lib/utils';

interface FileDropzoneProps {
  label: string;
  files: File[];
  onFilesAdded: (files: File[]) => void;
  placeholder?: string;
  testId?: string;
  required?: boolean;
  compact?: boolean;
}

export function FileDropzone({
  label,
  files,
  onFilesAdded,
  placeholder = "Drag & drop files here, or click to select",
  testId,
  required = false,
  compact = false
}: FileDropzoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesAdded(acceptedFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm'] }
  });

  return (
    <div>
      {label && (
        <label className="block typography-body-strong text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors",
          compact ? "p-4" : "p-6",
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        )}
      >
        <input {...getInputProps()} data-testid={testId} />
        <Upload className={cn("mx-auto text-gray-400", compact ? "h-8 w-8" : "h-10 w-10")} />
        <p className={cn("mt-2 text-gray-600 dark:text-gray-400", compact ? "text-xs" : "typography-caption")}>
          {placeholder}
        </p>
      </div>
      {files.length > 0 && !compact && (
        <ul className="mt-2 typography-caption text-gray-500 dark:text-gray-400">
          {files.map((file, idx) => (
            <li key={idx} className="flex items-center">
              <FileUp className="w-4 h-4 mr-2" />
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
