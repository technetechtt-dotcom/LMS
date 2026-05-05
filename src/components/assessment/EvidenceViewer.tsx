import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { Button } from '../ui/Button';

interface EvidenceViewerProps {
  fileName: string;
  fileType: string;
  fileSize: string;
  uploadDate: string;
  /** When provided (typically a PDF blob URL), an inline preview is shown */
  previewUrl?: string | null;
  onDownload?: () => void;
  onOpen?: () => void;
}

export function EvidenceViewer({
  fileName,
  fileType,
  fileSize,
  uploadDate,
  previewUrl,
  onDownload,
  onOpen
}: EvidenceViewerProps) {
  const isPdfLike =
    fileType.toLowerCase().includes('pdf') ||
    fileType.toUpperCase().includes('PDF');
  const canFrame = Boolean(previewUrl) && isPdfLike;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      <div className="aspect-video flex flex-col items-center justify-center bg-gray-100 border-b border-gray-200 overflow-hidden">
        {canFrame && previewUrl ?
        <iframe
          src={previewUrl}
          title={fileName}
          className="h-full min-h-[220px] w-full border-0 bg-white" /> :

        <>
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500">
              {previewUrl ?
              'Open in a new tab to preview this file type' :
              'No preview URL available'}
            </p>
          </>
        }
      </div>
      <div className="p-4 bg-white flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h4 className="text-sm font-medium text-gray-900">{fileName}</h4>
          <p className="text-xs text-gray-500">
            {fileType} • {fileSize} • Uploaded {uploadDate}
          </p>
        </div>
        <div className="flex space-x-2">
          {(onOpen || previewUrl) &&
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Eye className="h-4 w-4" />}
            onClick={() =>
            previewUrl ?
            window.open(previewUrl, '_blank', 'noopener,noreferrer') :
            onOpen?.()
            }>
            
            View
          </Button>
          }
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => {
              if (onDownload) {
                onDownload();
                return;
              }
              if (previewUrl) {
                window.open(previewUrl, '_blank', 'noopener,noreferrer');
              }
            }}>
            
            Download
          </Button>
        </div>
      </div>
    </div>);

}
