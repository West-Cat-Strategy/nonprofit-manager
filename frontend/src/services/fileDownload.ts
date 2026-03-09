import type { AxiosResponse } from 'axios';

export interface DownloadedFile {
  blob: Blob;
  filename: string;
  contentType: string;
}

const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

export function getFilenameFromContentDisposition(headerValue: string | undefined): string | null {
  if (!headerValue) {
    return null;
  }

  const filenameStarMatch = headerValue.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (filenameStarMatch?.[1]) {
    try {
      return decodeURIComponent(filenameStarMatch[1].trim());
    } catch {
      return filenameStarMatch[1].trim();
    }
  }

  const filenameMatch = headerValue.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (filenameMatch?.[1]) {
    return filenameMatch[1].trim();
  }

  return null;
}

export function buildDownloadedFile(
  response: AxiosResponse<Blob>,
  fallbackFilename: string
): DownloadedFile {
  const contentDisposition = (response.headers?.['content-disposition'] as string | undefined) ?? undefined;
  const contentType = (response.headers?.['content-type'] as string | undefined) ?? DEFAULT_CONTENT_TYPE;

  return {
    blob: response.data instanceof Blob ? response.data : new Blob([response.data], { type: contentType }),
    filename: getFilenameFromContentDisposition(contentDisposition) ?? fallbackFilename,
    contentType,
  };
}

export function triggerFileDownload(file: DownloadedFile): void {
  const url = window.URL.createObjectURL(file.blob);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.URL.revokeObjectURL(url);
  }
}
