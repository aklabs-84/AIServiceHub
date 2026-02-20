import type { SupabaseClient } from '@supabase/supabase-js';
import type { Attachment, AttachmentRow, CommentTargetType } from '@/types/database';

export function mapAttachmentFromDB(data: AttachmentRow): Attachment {
  return {
    id: data.id,
    targetId: data.target_id,
    targetType: data.target_type as CommentTargetType,
    name: data.name,
    size: data.size,
    contentType: data.content_type,
    storagePath: data.storage_path,
    createdBy: data.created_by,
    createdAt: new Date(data.created_at),
  };
}

export async function getByTarget(
  client: SupabaseClient,
  targetId: string,
  targetType: 'app' | 'prompt'
): Promise<Attachment[]> {
  const { data, error } = await client
    .from('attachments')
    .select('*')
    .eq('target_id', targetId)
    .eq('target_type', targetType)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as AttachmentRow[]).map(mapAttachmentFromDB);
}

export async function create(
  client: SupabaseClient,
  targetId: string,
  targetType: 'app' | 'prompt',
  file: { name: string; size: number; contentType: string; storagePath: string },
  userId: string
): Promise<Attachment> {
  const { data, error } = await client
    .from('attachments')
    .insert({
      target_id: targetId,
      target_type: targetType,
      name: file.name,
      size: file.size,
      content_type: file.contentType,
      storage_path: file.storagePath,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapAttachmentFromDB(data as AttachmentRow);
}

export async function remove(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('attachments').delete().eq('id', id);
  if (error) throw error;
}

export async function removeByTarget(
  client: SupabaseClient,
  targetId: string,
  targetType: 'app' | 'prompt'
): Promise<void> {
  const { error } = await client
    .from('attachments')
    .delete()
    .eq('target_id', targetId)
    .eq('target_type', targetType);

  if (error) throw error;
}

// --- Storage operations (upload/download via API routes) ---

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export async function uploadFile(
  file: File,
  targetType: 'app' | 'prompt',
  idToken: string
): Promise<{ name: string; size: number; contentType: string; storagePath: string }> {
  const response = await fetch('/api/attachments/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type || 'application/octet-stream',
      targetType,
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
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
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

export async function getDownloadUrl(storagePath: string, targetType: 'app' | 'prompt', idToken: string): Promise<string> {
  const response = await fetch('/api/attachments/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ path: storagePath, targetType }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || '다운로드 링크 생성에 실패했습니다.');
  }

  const data = await response.json();
  return data.url as string;
}

export async function downloadFile(
  storagePath: string,
  filename: string,
  targetType: 'app' | 'prompt',
  idToken: string,
  fallbackUrl?: string
) {
  let url = fallbackUrl;
  if (!url) {
    url = await getDownloadUrl(storagePath, targetType, idToken);
  }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('파일 다운로드에 실패했습니다.');
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

export async function deleteFile(storagePath: string, targetType: 'app' | 'prompt', idToken: string) {
  const response = await fetch('/api/attachments/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ path: storagePath, targetType }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || '첨부 파일 삭제에 실패했습니다.');
  }
}
