import { toast } from 'sonner';
import { downloadJson } from './downloadJson';

export function exportRecordsAsJson(
  filename: string,
  records: unknown[],
  label = 'Export',
): void {
  if (!records.length) {
    toast.error('Nothing to export');
    return;
  }
  downloadJson(filename, records);
  toast.success(`${label} downloaded`);
}

export function openFileUrl(fileUrl: string | undefined, label = 'File'): void {
  if (!fileUrl?.trim()) {
    toast.error(`${label} is not available`);
    return;
  }
  window.open(fileUrl, '_blank', 'noopener,noreferrer');
}

export async function copyTextToClipboard(
  text: string,
  successMessage = 'Copied to clipboard',
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error('Could not copy to clipboard');
  }
}

export async function copySharePath(
  path: string,
  successMessage = 'Link copied to clipboard',
): Promise<void> {
  const url = `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
  await copyTextToClipboard(url, successMessage);
}
