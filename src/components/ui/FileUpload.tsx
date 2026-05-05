import React, { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle } from 'lucide-react';
interface FileUploadProps {
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  onUpload?: (files: File[]) => void;
}
interface FileItem {
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
}
export function FileUpload({
  accept = '.pdf,.doc,.docx,.jpg,.png',
  maxSizeMB = 10,
  multiple = true,
  onUpload
}: FileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const processFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(
      (file) => file.size <= maxSizeMB * 1024 * 1024
    );
    if (validFiles.length < newFiles.length) {

      // Could show toast here for skipped files
    }const newFileItems: FileItem[] = validFiles.map((file) => ({
      file,
      progress: 0,
      status: 'uploading'
    }));
    setFiles((prev) => multiple ? [...prev, ...newFileItems] : newFileItems);
    // Simulate upload progress
    newFileItems.forEach((item) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        if (progress >= 100) {
          clearInterval(interval);
          setFiles((prev) =>
          prev.map((f) =>
          f.file === item.file ?
          {
            ...f,
            progress: 100,
            status: 'complete'
          } :
          f
          )
          );
        } else {
          setFiles((prev) =>
          prev.map((f) =>
          f.file === item.file ?
          {
            ...f,
            progress
          } :
          f
          )
          );
        }
      }, 200);
    });
    if (onUpload) onUpload(validFiles);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };
  const removeFile = (fileToRemove: File) => {
    setFiles((prev) => prev.filter((item) => item.file !== fileToRemove));
  };
  return (
    <div className="w-full space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-brand-blue bg-blue-50' : 'border-gray-300 hover:border-brand-navy hover:bg-gray-50'}
        `}>
        
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect} />
        
        <Upload
          className={`mx-auto h-12 w-12 ${isDragging ? 'text-brand-blue' : 'text-gray-400'}`} />
        
        <p className="mt-2 text-sm font-medium text-gray-900">
          Click to upload or drag and drop
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {accept.replace(/\./g, ' ').toUpperCase()} (Max {maxSizeMB}MB)
        </p>
      </div>

      {files.length > 0 &&
      <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
          {files.map((item, index) =>
        <li
          key={index}
          className="px-4 py-3 flex items-center justify-between bg-white">
          
              <div className="flex items-center flex-1 min-w-0">
                <File className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <div className="flex items-center ml-4 space-x-4">
                {item.status === 'uploading' &&
            <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                className="bg-brand-blue h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${item.progress}%`
                }} />
              
                  </div>
            }
                {item.status === 'complete' &&
            <CheckCircle className="h-5 w-5 text-green-500" />
            }
                <button
              onClick={(e) => {
                e.stopPropagation();
                removeFile(item.file);
              }}
              className="text-gray-400 hover:text-red-500">
              
                  <X className="h-5 w-5" />
                </button>
              </div>
            </li>
        )}
        </ul>
      }
    </div>);

}