import { PromptAttachment } from '@/types/prompt';

export async function uploadPromptAttachment(file: File, idToken: string): Promise<PromptAttachment> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/prompt-attachments/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || '파일 업로드에 실패했습니다.');
  }

  const data = await response.json();
  return data.attachment as PromptAttachment;
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
