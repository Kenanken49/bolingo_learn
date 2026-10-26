import { supabase } from './supabase';
import { checkUploadAllowed } from './tiers';

export type UploadStatus = 'processing' | 'ready' | 'failed';

export interface UserUpload {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  status: UploadStatus;
}

/**
 * Upload a raw file (PDF, audio, text) to the `user-materials` bucket and kick
 * off the async curriculum pipeline (parse -> JSON curriculum -> audiobook).
 *
 * Storage path is `<user_id>/<file_name>` to match the Storage RLS policies.
 * File picking (e.g. expo-document-picker) is left to the caller — pass the
 * bytes you already have.
 */
export async function uploadRawFile(
  data: ArrayBuffer | Uint8Array,
  fileName: string,
  contentType: string
): Promise<UserUpload> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be signed in to upload.');

  // Pre-flight tier check for text (binary files are sized server-side —
  // the Edge Function enforces the same rules authoritatively).
  let probe: string | null = null;
  try {
    probe = new TextDecoder('utf-8', { fatal: true }).decode(data.slice(0, 200_000));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    probe = null; // binary — let the server decide
  }
  const pre = await checkUploadAllowed(user.id, fileName, probe);
  if (!pre.allowed) throw new Error(pre.reason);

  const path = `${user.id}/${fileName}`;
  const { error: storageError } = await supabase.storage
    .from('user-materials')
    .upload(path, data, { contentType, upsert: true });
  if (storageError) throw storageError;

  const { data: upload, error: rowError } = await supabase
    .from('user_uploads')
    .insert({ user_id: user.id, file_name: fileName, file_url: path })
    .select()
    .single();
  if (rowError || !upload) throw rowError ?? new Error('Failed to create upload record.');

  // Fire-and-forget: the Edge Function flips status to ready/failed.
  const { error: fnError } = await supabase.functions.invoke('process-upload', {
    body: { upload_id: upload.id },
  });
  if (fnError) console.warn('process-upload invocation failed:', fnError.message);

  return upload as UserUpload;
}

/** Poll the upload until it leaves `processing` (or timeout). */
export async function waitForUploadReady(uploadId: string, timeoutMs = 120_000): Promise<UserUpload> {
  const start = Date.now();
  for (;;) {
    const { data, error } = await supabase.from('user_uploads').select('*').eq('id', uploadId).single();
    if (error || !data) throw error ?? new Error('Upload not found.');
    if (data.status !== 'processing') return data as UserUpload;
    if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for curriculum.');
    await new Promise((r) => setTimeout(r, 3000));
  }
}
