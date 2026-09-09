import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle, File, Loader2, Upload, X } from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  /** Resolving means the API accepted the upload; rejecting displays an error state. */
  onUpload?: (files: File[]) => Promise<unknown> | unknown;
  /** Use when this control only selects a file for a later form submission. */
  selectionOnly?: boolean;
}

interface FileItem {
  file: File;
  status: 'selected' | 'uploading' | 'complete' | 'error';
  error?: string;
}

export function FileUpload({
  accept = '.pdf,.doc,.docx,.jpg,.png',
  maxSizeMB = 10,
  multiple = true,
  onUpload,
  selectionOnly = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateBatch = (
    selected: File[],
    update: Pick<FileItem, 'status' | 'error'>,
  ) => {
    setFiles((current) =>
      current.map((item) =>
        selected.includes(item.file) ? { ...item, ...update } : item,
      ),
    );
  };

  const processFiles = async (newFiles: File[]) => {
    const limit = maxSizeMB * 1024 * 1024;
    const validFiles = newFiles.filter((file) => file.size <= limit);
    setValidationError(
      validFiles.length < newFiles.length
        ? `One or more files exceeded the ${maxSizeMB} MB limit.`
        : '',
    );
    if (!validFiles.length) return;

    const items: FileItem[] = validFiles.map((file) => ({
      file,
      status: selectionOnly || !onUpload ? 'selected' : 'uploading',
    }));
    setFiles((current) => (multiple ? [...current, ...items] : items));

    if (!onUpload) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      await onUpload(validFiles);
      if (!selectionOnly) {
        updateBatch(validFiles, { status: 'complete', error: undefined });
      }
    } catch (error) {
      updateBatch(validFiles, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    void processFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="w-full space-y-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose files to upload"
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 ${
          isDragging
            ? 'border-brand-blue bg-blue-50'
            : 'border-gray-300 hover:border-brand-navy hover:bg-gray-50'
        }`}>
        <input
          type="file"
          ref={fileInputRef}
          className="sr-only"
          accept={accept}
          multiple={multiple}
          onChange={(event) => {
            if (event.target.files) {
              void processFiles(Array.from(event.target.files));
            }
          }}
        />
        <Upload
          aria-hidden="true"
          className={`mx-auto h-12 w-12 ${isDragging ? 'text-brand-blue' : 'text-gray-400'}`}
        />
        <p className="mt-2 text-sm font-medium text-gray-900">
          Choose a file or drag and drop
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {accept.replace(/\./g, ' ').toUpperCase()} (Max {maxSizeMB} MB)
        </p>
      </div>

      {validationError && (
        <p role="alert" className="text-sm text-red-700">
          {validationError}
        </p>
      )}

      {files.length > 0 && (
        <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
          {files.map((item) => (
            <li
              key={`${item.file.name}-${item.file.size}-${item.file.lastModified}`}
              className="px-4 py-3 flex items-center justify-between bg-white">
              <div className="flex items-center flex-1 min-w-0">
                <File aria-hidden="true" className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                    {item.status === 'selected' ? ' · Selected' : ''}
                    {item.status === 'complete' ? ' · Uploaded and verified' : ''}
                  </p>
                  {item.error && (
                    <p role="alert" className="text-xs text-red-700 mt-1">
                      {item.error}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center ml-4 space-x-3">
                {item.status === 'uploading' && (
                  <Loader2 aria-label="Uploading" className="h-5 w-5 text-brand-blue animate-spin" />
                )}
                {item.status === 'complete' && (
                  <CheckCircle aria-label="Upload verified" className="h-5 w-5 text-green-600" />
                )}
                {item.status === 'error' && (
                  <AlertCircle aria-label="Upload failed" className="h-5 w-5 text-red-600" />
                )}
                <button
                  type="button"
                  aria-label={`Remove ${item.file.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setFiles((current) => current.filter((candidate) => candidate.file !== item.file));
                  }}
                  className="text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 rounded">
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
