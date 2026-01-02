import { PromptAttachment } from '@/types/prompt';

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export async function uploadPromptAttachment(file: File, idToken: string): Promise<PromptAttachment> {
  const response = await fetch('/api/prompt-attachments/sign-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type || 'application/octet-stream',
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || '업로드 준비에 실패했습니다.');
  }

  const data = await response.json();
  const signedUrl = data.signedUrl as string;
  const storagePath = data.storagePath as string;

  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('파일 업로드에 실패했습니다.');
  }

  return {
    name: file.name,
    size: file.size,
    contentType: file.type || 'application/octet-stream',
    storagePath,
  };
}

export async function getPromptAttachmentDownloadUrl(storagePath: string, idToken: string): Promise<string> {
  const response = await fetch('/api/prompt-attachments/sign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ path: storagePath }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || '다운로드 링크 생성에 실패했습니다.');
  }

  const data = await response.json();
  return data.url as string;
}

export async function downloadPromptAttachment(storagePath: string, filename: string, idToken: string, fallbackUrl?: string) {
  let url = fallbackUrl;
  if (!url) {
    url = await getPromptAttachmentDownloadUrl(storagePath, idToken);
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('파일 다운로드에 실패했습니다.');
    }
    const blob = await response.blob();
    triggerDownload(blob, filename);
  } catch (error) {
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    throw error;
  }
}

export async function deletePromptAttachment(storagePath: string, idToken: string) {
  const response = await fetch('/api/prompt-attachments/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ path: storagePath }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || '첨부 파일 삭제에 실패했습니다.');
  }
}
